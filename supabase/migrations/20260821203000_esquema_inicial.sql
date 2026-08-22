-- ============================================================================
-- R-01 · Asistente de Levantamiento de Requerimientos
-- Esquema inicial: tablas, índices, disparadores y seguridad por fila.
--
-- Principio de privacidad del proyecto: nunca se guarda la transcripción
-- original ni el mapa de anonimización. Solo el texto ya anonimizado.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Utilidad: mantener updated_at al día
-- ----------------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles — datos del analista, colgados de auth.users
-- ----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  nombre       text,
  organizacion text,
  created_at   timestamptz not null default now()
);

comment on table public.profiles is 'Perfil del analista. Se crea solo al registrarse.';

-- Alta automática del perfil cuando nace el usuario
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ----------------------------------------------------------------------------
-- reuniones — una por sesión de levantamiento
-- ----------------------------------------------------------------------------
create table public.reuniones (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  titulo                    text not null,
  proyecto                  text not null default '',
  dominio                   text not null default '',
  fecha_reunion             date,
  transcripcion_anonimizada text not null default '',
  tiene_original            boolean not null default false,
  n_palabras                integer not null default 0,
  n_entidades_anonimizadas  integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on column public.reuniones.transcripcion_anonimizada is
  'Texto ya anonimizado. La transcripción original nunca se persiste.';
comment on column public.reuniones.tiene_original is
  'Deja constancia de que existió un original, sin guardarlo.';

create trigger reuniones_updated_at
  before update on public.reuniones
  for each row execute function public.tocar_updated_at();

create index reuniones_user_fecha_idx
  on public.reuniones (user_id, created_at desc);

create index reuniones_busqueda_idx
  on public.reuniones
  using gin (to_tsvector('spanish', titulo || ' ' || proyecto));

-- ----------------------------------------------------------------------------
-- documentos — cada ejecución del motor sobre una reunión
-- ----------------------------------------------------------------------------
create table public.documentos (
  id             uuid primary key default gen_random_uuid(),
  reunion_id     uuid not null references public.reuniones (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  version_prompt smallint not null check (version_prompt between 1 and 3),
  config         jsonb not null default '{}'::jsonb,
  prompt_enviado text not null default '',
  contenido_md   text not null default '',
  metricas       jsonb not null default '{}'::jsonb,
  estado         text not null default 'completo'
                 check (estado in ('generando', 'completo', 'parcial', 'error')),
  created_at     timestamptz not null default now()
);

comment on column public.documentos.prompt_enviado is
  'El prompt exacto que se envió. Es la evidencia que hace auditable el documento.';
comment on column public.documentos.config is
  'proyecto, dominio, secciones, detalle, tono, modelo, temperatura, top_p, modo_troceado';
comment on column public.documentos.metricas is
  'n_palabras, n_rf, n_rnf, n_supuestos, n_preguntas_abiertas, n_conflictos, duracion_ms, llamadas';

create index documentos_reunion_idx on public.documentos (reunion_id, created_at desc);
create index documentos_user_idx    on public.documentos (user_id, created_at desc);
create index documentos_version_idx on public.documentos (user_id, version_prompt);

create index documentos_busqueda_idx
  on public.documentos
  using gin (to_tsvector('spanish', contenido_md));

-- ----------------------------------------------------------------------------
-- requerimientos — extraídos del documento, con su cita de origen
-- ----------------------------------------------------------------------------
create table public.requerimientos (
  id                  uuid primary key default gen_random_uuid(),
  documento_id        uuid not null references public.documentos (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  codigo              text not null,
  tipo                text not null check (tipo in ('RF', 'RNF')),
  texto               text not null,
  prioridad           text,
  criterio_aceptacion text,
  cita_origen         text,
  cita_offset         integer,
  orden               integer not null default 0,
  created_at          timestamptz not null default now()
);

comment on column public.requerimientos.cita_origen is
  'Frase de la transcripción que lo originó. Sin cita, el requerimiento se marca como no verificable.';

create index requerimientos_documento_idx on public.requerimientos (documento_id, orden);
create index requerimientos_user_idx      on public.requerimientos (user_id);

-- ----------------------------------------------------------------------------
-- plantillas — documentos de referencia reutilizables para la versión 3
-- ----------------------------------------------------------------------------
create table public.plantillas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  nombre     text not null,
  contenido  text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plantillas_updated_at
  before update on public.plantillas
  for each row execute function public.tocar_updated_at();

create index plantillas_user_idx on public.plantillas (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- exportaciones — descargas y envíos a Drive, con su resultado
-- ----------------------------------------------------------------------------
create table public.exportaciones (
  id           uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  formato      text not null check (formato in ('pdf', 'docx', 'md')),
  destino      text not null check (destino in ('descarga', 'drive')),
  url_externa  text,
  estado       text not null default 'pendiente'
               check (estado in ('pendiente', 'ok', 'error')),
  error        text,
  created_at   timestamptz not null default now()
);

create index exportaciones_documento_idx on public.exportaciones (documento_id, created_at desc);
create index exportaciones_user_idx      on public.exportaciones (user_id, created_at desc);

-- ============================================================================
-- Seguridad por fila. Se activa desde el primer día, no al final.
-- Cada usuario ve y toca únicamente lo suyo.
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.reuniones      enable row level security;
alter table public.documentos     enable row level security;
alter table public.requerimientos enable row level security;
alter table public.plantillas     enable row level security;
alter table public.exportaciones  enable row level security;

-- profiles: la llave es el propio id
create policy "perfil propio: ver"       on public.profiles for select using (auth.uid() = id);
create policy "perfil propio: crear"     on public.profiles for insert with check (auth.uid() = id);
create policy "perfil propio: editar"    on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- reuniones
create policy "reuniones: ver"    on public.reuniones for select using (auth.uid() = user_id);
create policy "reuniones: crear"  on public.reuniones for insert with check (auth.uid() = user_id);
create policy "reuniones: editar" on public.reuniones for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reuniones: borrar" on public.reuniones for delete using (auth.uid() = user_id);

-- documentos
create policy "documentos: ver"    on public.documentos for select using (auth.uid() = user_id);
create policy "documentos: crear"  on public.documentos for insert with check (auth.uid() = user_id);
create policy "documentos: editar" on public.documentos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "documentos: borrar" on public.documentos for delete using (auth.uid() = user_id);

-- requerimientos
create policy "requerimientos: ver"    on public.requerimientos for select using (auth.uid() = user_id);
create policy "requerimientos: crear"  on public.requerimientos for insert with check (auth.uid() = user_id);
create policy "requerimientos: editar" on public.requerimientos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "requerimientos: borrar" on public.requerimientos for delete using (auth.uid() = user_id);

-- plantillas
create policy "plantillas: ver"    on public.plantillas for select using (auth.uid() = user_id);
create policy "plantillas: crear"  on public.plantillas for insert with check (auth.uid() = user_id);
create policy "plantillas: editar" on public.plantillas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plantillas: borrar" on public.plantillas for delete using (auth.uid() = user_id);

-- exportaciones
create policy "exportaciones: ver"    on public.exportaciones for select using (auth.uid() = user_id);
create policy "exportaciones: crear"  on public.exportaciones for insert with check (auth.uid() = user_id);
create policy "exportaciones: editar" on public.exportaciones for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exportaciones: borrar" on public.exportaciones for delete using (auth.uid() = user_id);
