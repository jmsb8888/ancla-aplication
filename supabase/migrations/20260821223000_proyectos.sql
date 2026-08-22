-- ============================================================================
-- Etapa 9 · Proyectos
--
-- Hasta ahora el proyecto era una columna de texto que se reescribía en cada
-- reunión: dos tipeos distintos creaban dos proyectos. Pasa a ser una entidad
-- con su cliente, su dominio por defecto, su plantilla de referencia y su
-- carpeta de Drive, de modo que cada proyecto archive donde le corresponde.
--
-- La columna `reuniones.proyecto` se conserva: guarda lo que se escribió en su
-- momento y permite migrar sin perder nada.
-- ============================================================================

create table public.proyectos (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  nombre             text not null,
  cliente            text not null default '',
  -- Se propone al crear una reunión; ahorra reescribirlo cada vez.
  dominio            text not null default '',
  -- Documento de referencia que usa la versión 3 del prompt.
  plantilla_md       text not null default '',
  -- Identificador de la carpeta de Drive donde archiva la automatización.
  carpeta_drive      text not null default '',
  activo             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column public.proyectos.carpeta_drive is
  'Id o ruta de la carpeta de Drive. Viaja en el webhook para que cada proyecto archive por separado.';
comment on column public.proyectos.plantilla_md is
  'Documento de referencia heredado por las reuniones del proyecto.';

create trigger proyectos_updated_at
  before update on public.proyectos
  for each row execute function public.tocar_updated_at();

-- Un mismo usuario no puede tener dos proyectos con el mismo nombre: es
-- justamente el problema que esta tabla viene a resolver.
create unique index proyectos_nombre_unico
  on public.proyectos (user_id, lower(nombre));

create index proyectos_user_idx on public.proyectos (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Las reuniones cuelgan del proyecto
-- ----------------------------------------------------------------------------
alter table public.reuniones
  add column proyecto_id uuid references public.proyectos (id) on delete set null;

create index reuniones_proyecto_idx on public.reuniones (proyecto_id, created_at desc);

comment on column public.reuniones.proyecto is
  'Nombre escrito a mano antes de que existieran los proyectos. Se conserva como histórico.';

-- ----------------------------------------------------------------------------
-- Seguridad por fila
-- ----------------------------------------------------------------------------
alter table public.proyectos enable row level security;

create policy "proyectos: ver"    on public.proyectos for select using (auth.uid() = user_id);
create policy "proyectos: crear"  on public.proyectos for insert with check (auth.uid() = user_id);
create policy "proyectos: editar" on public.proyectos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "proyectos: borrar" on public.proyectos for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Migración de lo que ya existiera: cada nombre de proyecto escrito a mano se
-- convierte en un proyecto real del mismo usuario, y sus reuniones se enlazan.
-- ----------------------------------------------------------------------------
insert into public.proyectos (user_id, nombre, dominio)
select distinct on (r.user_id, lower(trim(r.proyecto)))
       r.user_id,
       trim(r.proyecto),
       coalesce(r.dominio, '')
from public.reuniones r
where coalesce(trim(r.proyecto), '') <> ''
on conflict do nothing;

update public.reuniones r
set proyecto_id = p.id
from public.proyectos p
where r.proyecto_id is null
  and p.user_id = r.user_id
  and lower(p.nombre) = lower(trim(r.proyecto));
