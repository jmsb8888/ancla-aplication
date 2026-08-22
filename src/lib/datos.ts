/**
 * Acceso a datos. Todo pasa por Supabase con seguridad por fila: cada consulta
 * devuelve únicamente lo del usuario de la sesión, sin que haya que filtrar
 * aquí. El `user_id` se escribe igualmente porque las políticas lo exigen.
 */
import { supabase } from "./supabase";
import type { Config } from "./prompt";
import type { Sustitucion } from "./anonimizar";
import { verificarDocumento } from "./trazabilidad";

export interface ReunionResumen {
  id: string;
  titulo: string;
  proyecto: string;
  proyecto_id: string | null;
  fecha_reunion: string | null;
  n_palabras: number;
  created_at: string;
  documentos: { count: number }[];
}

export interface Proyecto {
  id: string;
  nombre: string;
  cliente: string;
  dominio: string;
  plantilla_md: string;
  carpeta_drive: string;
  activo: boolean;
  created_at: string;
}

export interface DocumentoGuardado {
  id: string;
  reunion_id: string;
  version_prompt: number;
  config: Record<string, unknown>;
  prompt_enviado: string;
  contenido_md: string;
  metricas: Record<string, number>;
  estado: string;
  created_at: string;
}

/**
 * Modo demostración: solo en desarrollo y solo si la URL trae `?demo=1`.
 * Sirve para revisar las pantallas con contenido sin depender de la base.
 * No existe en la versión compilada.
 */
const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has("demo");

/** ¿Estamos en modo demostración? Solo en desarrollo. */
export function modoDemo(): boolean {
  return DEMO;
}

const TRANSCRIPCION_DEMO = `[00:02] [PERSONA_1]: El personal marca entrada en la portería pero ese registro no se cruza con el turno asignado, y eso genera reprocesos al cierre de mes.
[00:03] [PERSONA_2]: Necesitamos que quede auditoría de quién abre el molinete manualmente y a qué hora.
[00:05] [PERSONA_1]: El reconocimiento facial lo descartamos, no está presupuestado.
[00:08] [PERSONA_2]: Y que el gerente de planta pueda ver el estado de las tres porterías en tiempo real.`;

const DOC_DEMO = `## 1. Propósito y alcance

Este documento especifica los requerimientos del módulo de control de acceso a planta.

## 3. Requerimientos funcionales

| Código | Requerimiento | Prioridad | Origen |
| --- | --- | --- | --- |
| RF-01 | El sistema debe validar el marcaje de entrada contra el turno asignado del personal. | Must | [PERSONA_1] |
| RF-02 | El sistema debe registrar auditoría de cada apertura manual del molinete con usuario y hora. | Must | [PERSONA_2] |
| RF-03 | El sistema debe mostrar el estado de las tres porterías en tiempo real al gerente de planta. | Should | [PERSONA_2] |
| RF-04 | El sistema debe liquidar automáticamente las horas extra en la nómina. | Could | — |

## 4. Requerimientos no funcionales

| Código | Tipo | Requerimiento |
| --- | --- | --- |
| RNF-01 | Disponibilidad | El módulo debe operar 99.9% del tiempo. |

## 6. Conflictos y decisiones pendientes

- Bloqueo físico frente a alerta: las partes no llegaron a un acuerdo explícito.

## 7. Preguntas abiertas

- ¿Quién autoriza el acceso en horario nocturno?`;

const REUNION_DEMO = {
  id: "demo",
  titulo: "Levantamiento control de acceso",
  proyecto: "Proyecto ACCESO",
  dominio: "sistemas de control de acceso",
  fecha_reunion: "2026-08-21",
  transcripcion_anonimizada: TRANSCRIPCION_DEMO,
  tiene_original: true,
  n_palabras: 92,
  n_entidades_anonimizadas: 7,
  created_at: "2026-08-21T15:00:00Z",
};

function docDemo(version: number, id: string): DocumentoGuardado {
  return {
    id,
    reunion_id: "demo",
    version_prompt: version,
    config: { proyecto: "Proyecto ACCESO", tono: "técnico" },
    prompt_enviado: "Actúa como analista de requerimientos de software…",
    contenido_md: version === 1 ? DOC_DEMO.split("## 4.")[0] : DOC_DEMO,
    metricas: {
      n_palabras: version === 1 ? 120 : 260,
      n_rf: version === 1 ? 2 : 4,
      n_rnf: version === 1 ? 0 : 1,
      duracion_ms: 8400,
      llamadas: 6,
    },
    estado: "completo",
    created_at: "2026-08-21T15:0" + version + ":00Z",
  };
}

async function idUsuario(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No hay sesión iniciada.");
  return data.user.id;
}

/** Crea la reunión con su transcripción ya anonimizada. */
export async function crearReunion(datos: {
  titulo: string;
  proyectoId: string | null;
  proyecto: string;
  dominio: string;
  transcripcionAnonimizada: string;
  huboOriginal: boolean;
  entidadesAnonimizadas: number;
}): Promise<string> {
  const user_id = await idUsuario();
  const palabras = datos.transcripcionAnonimizada.trim().split(/\s+/).filter(Boolean).length;

  const { data, error } = await supabase
    .from("reuniones")
    .insert({
      user_id,
      titulo: datos.titulo,
      proyecto_id: datos.proyectoId,
      proyecto: datos.proyecto,
      dominio: datos.dominio,
      fecha_reunion: new Date().toISOString().slice(0, 10),
      transcripcion_anonimizada: datos.transcripcionAnonimizada,
      tiene_original: datos.huboOriginal,
      n_palabras: palabras,
      n_entidades_anonimizadas: datos.entidadesAnonimizadas,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/** Guarda un documento generado con su prompt y sus métricas. */
export async function guardarDocumento(datos: {
  reunionId: string;
  config: Config;
  /** Cómo se ejecutó: qué modelo y en cuántas llamadas. */
  ejecucion?: { modelo: string; modo: string };
  promptEnviado: string;
  contenidoMd: string;
  metricas: Record<string, number>;
  estado: "completo" | "parcial" | "error";
}): Promise<string> {
  const user_id = await idUsuario();

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      user_id,
      reunion_id: datos.reunionId,
      version_prompt: datos.config.version,
      config: {
        proyecto: datos.config.proyecto,
        dominio: datos.config.dominio,
        secciones: datos.config.secciones.filter((s) => s.activa).map((s) => s.nombre),
        detalle: datos.config.detalle,
        tono: datos.config.tono,
        ...datos.ejecucion,
      },
      prompt_enviado: datos.promptEnviado,
      contenido_md: datos.contenidoMd,
      metricas: datos.metricas,
      estado: datos.estado,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * Guarda los requerimientos del documento **junto con la frase que los respalda**.
 *
 * La cita es la razón de ser de la trazabilidad. Sin ella queda el
 * requerimiento y la afirmación de que alguien lo dijo, que es justo lo que no
 * hay que pedirle a nadie que crea. Antes se calculaba para pintarla en
 * pantalla y se descartaba al guardar: al reabrir la reunión, el respaldo había
 * desaparecido y las columnas `cita_origen` y `cita_offset` quedaban vacías.
 *
 * La extracción la hace `verificarDocumento`, que ya sabía hacerla. Tener dos
 * parsers para lo mismo era pedir que se separaran con el tiempo.
 */
export async function guardarRequerimientos(
  documentoId: string,
  contenidoMd: string,
  transcripcion: string,
) {
  const user_id = await idUsuario();

  const filas = verificarDocumento(contenidoMd, transcripcion).map((r, i) => ({
    documento_id: documentoId,
    user_id,
    codigo: r.codigo,
    tipo: r.tipo,
    texto: r.texto.slice(0, 1000),
    // Solo se guarda la cita cuando de verdad respalda: una por debajo del
    // umbral confundiría más de lo que ayuda.
    cita_origen: r.respaldo.respaldado ? (r.respaldo.cita?.slice(0, 1000) ?? null) : null,
    cita_offset: r.respaldo.respaldado ? r.respaldo.offset : null,
    orden: i,
  }));

  if (!filas.length) return 0;
  const { error } = await supabase.from("requerimientos").insert(filas);
  if (error) throw new Error(error.message);
  return filas.length;
}

// ------------------------------------------------------------------ proyectos

export async function listarProyectos(): Promise<Proyecto[]> {
  if (DEMO) {
    return [
      {
        id: "demo-p",
        nombre: "Proyecto ACCESO",
        cliente: "Planta industrial",
        dominio: "sistemas de control de acceso",
        plantilla_md: "",
        carpeta_drive: "1AbCdEfGhIjK",
        activo: true,
        created_at: "2026-08-01T10:00:00Z",
      },
    ];
  }
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Proyecto[];
}

export async function crearProyecto(datos: {
  nombre: string;
  cliente?: string;
  dominio?: string;
  plantilla_md?: string;
  carpeta_drive?: string;
}): Promise<Proyecto> {
  const user_id = await idUsuario();
  const { data, error } = await supabase
    .from("proyectos")
    .insert({
      user_id,
      nombre: datos.nombre.trim(),
      cliente: datos.cliente?.trim() ?? "",
      dominio: datos.dominio?.trim() ?? "",
      plantilla_md: datos.plantilla_md ?? "",
      carpeta_drive: datos.carpeta_drive?.trim() ?? "",
    })
    .select("*")
    .single();

  if (error) {
    // El índice único es lo que impide que dos tipeos creen dos proyectos.
    if (error.code === "23505") throw new Error("Ya tienes un proyecto con ese nombre.");
    throw new Error(error.message);
  }
  return data as unknown as Proyecto;
}

export async function actualizarProyecto(id: string, cambios: Partial<Proyecto>) {
  const { error } = await supabase.from("proyectos").update(cambios).eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("Ya tienes un proyecto con ese nombre.");
    throw new Error(error.message);
  }
}

export async function borrarProyecto(id: string) {
  const { error } = await supabase.from("proyectos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function obtenerProyecto(id: string): Promise<Proyecto | null> {
  if (DEMO) return (await listarProyectos())[0] ?? null;
  const { data, error } = await supabase.from("proyectos").select("*").eq("id", id).single();
  if (error) return null;
  return data as unknown as Proyecto;
}

// ------------------------------------------------------------------ reuniones

export async function listarReuniones(busqueda = "", proyectoId?: string): Promise<ReunionResumen[]> {
  if (DEMO) {
    return [
      { ...REUNION_DEMO, proyecto_id: "demo-p", documentos: [{ count: 3 }] } as unknown as ReunionResumen,
    ];
  }
  let consulta = supabase
    .from("reuniones")
    .select(
      "id, titulo, proyecto, proyecto_id, fecha_reunion, n_palabras, created_at, documentos(count)",
    )
    .order("created_at", { ascending: false });

  if (proyectoId) consulta = consulta.eq("proyecto_id", proyectoId);

  if (busqueda.trim()) {
    const b = `%${busqueda.trim()}%`;
    consulta = consulta.or(`titulo.ilike.${b},proyecto.ilike.${b}`);
  }

  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ReunionResumen[];
}

export async function obtenerReunion(id: string) {
  if (DEMO) return REUNION_DEMO;
  const { data, error } = await supabase.from("reuniones").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listarDocumentos(reunionId: string): Promise<DocumentoGuardado[]> {
  if (DEMO) return [docDemo(3, "d3"), docDemo(2, "d2"), docDemo(1, "d1")];
  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("reunion_id", reunionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DocumentoGuardado[];
}

export async function obtenerDocumento(id: string): Promise<DocumentoGuardado> {
  const { data, error } = await supabase.from("documentos").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data as unknown as DocumentoGuardado;
}

export async function borrarReunion(id: string) {
  const { error } = await supabase.from("reuniones").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function borrarDocumento(id: string) {
  const { error } = await supabase.from("documentos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Datos para el tablero de métricas. */
export async function metricasGlobales(proyectoId?: string) {
  if (DEMO) {
    return [docDemo(3, "d3"), docDemo(2, "d2"), docDemo(1, "d1")].map((d) => ({
      version_prompt: d.version_prompt,
      metricas: d.metricas,
      created_at: d.created_at,
    }));
  }
  let consulta = supabase.from("documentos").select("version_prompt, metricas, created_at, reuniones!inner(proyecto_id)");
  if (proyectoId) consulta = consulta.eq("reuniones.proyecto_id", proyectoId);
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return (data ?? []) as { version_prompt: number; metricas: Record<string, number>; created_at: string }[];
}

/** Sustituciones que se aplicaron, solo para el registro de la reunión. */
export function contarAceptadas(subs: Sustitucion[] | null): number {
  return subs ? subs.filter((s) => s.aceptada).length : 0;
}
