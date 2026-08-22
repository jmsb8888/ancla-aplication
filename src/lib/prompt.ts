/**
 * Motor de prompts. Migrado literalmente desde el prototipo de la Fase 1
 * (`artefacto.txt`, función `construir()`), sin cambiar una palabra de los
 * textos: es la parte validada del proyecto.
 *
 * La progresión v1 → v2 → v3 es deliberada. Cada versión añade una capa y el
 * contador de capas la hace visible.
 */

export type Version = 1 | 2 | 3;

export interface Seccion {
  nombre: string;
  /** Prefijo de numeración: RF-01, RNF-01… */
  pref?: string;
  /** Cómo se representa: texto, lista o tabla. Solo informativo en la interfaz. */
  forma: "texto" | "lista" | "tabla";
  activa: boolean;
}

export const SECCIONES_POR_DEFECTO: Seccion[] = [
  { nombre: "Contexto del proyecto", forma: "texto", activa: true },
  { nombre: "Requerimientos funcionales", pref: "RF", forma: "lista", activa: true },
  { nombre: "Requerimientos no funcionales", pref: "RNF", forma: "lista", activa: true },
  { nombre: "Supuestos", forma: "lista", activa: true },
  { nombre: "Preguntas abiertas", forma: "lista", activa: true },
  { nombre: "Riesgos identificados", forma: "lista", activa: false },
  { nombre: "Glosario de términos", forma: "tabla", activa: false },
];

export const TONOS = [
  { valor: "técnico, sin lenguaje comercial", etiqueta: "Técnico" },
  {
    valor: "técnico pero accesible para perfiles no técnicos",
    etiqueta: "Técnico accesible",
  },
  { valor: "formal, orientado a contrato", etiqueta: "Formal contractual" },
] as const;

export const LIMITES = [
  { valor: 0, etiqueta: "Sin límite" },
  { valor: 500, etiqueta: "500 palabras" },
  { valor: 900, etiqueta: "900 palabras" },
  { valor: 1500, etiqueta: "1500 palabras" },
] as const;

/**
 * Las seis partes en las que se trocea la generación. El prototipo lo hizo por
 * el tope de 1000 tokens por respuesta; se conserva porque produce documentos
 * más completos y da un progreso honesto.
 */
export const PARTES: string[] = [
  "el encabezado de metadatos, el control de versiones, el propósito y alcance con su contexto y la sección de fuera de alcance",
  "únicamente el glosario",
  "únicamente los requerimientos funcionales, completos y con todas sus columnas",
  "únicamente los requerimientos no funcionales y los supuestos",
  "únicamente los conflictos y decisiones pendientes y las preguntas abiertas",
  "únicamente la trazabilidad y la nota de cierre",
];

export const CIERRE_DE_PARTE =
  "No repitas otras secciones, no incluyas preámbulo ni comentarios finales. " +
  "Continúa la numeración de secciones donde corresponda.";

export interface Config {
  version: Version;
  proyecto: string;
  dominio: string;
  secciones: Seccion[];
  /** 0 = sin límite */
  detalle: number;
  tono: string;
  /** Documento de referencia, obligatorio en v3 */
  refdoc: string;
  transcripcion: string;
}

export type TipoBloque =
  | "instruccion"
  | "rol"
  | "tarea"
  | "restricciones"
  | "referencia"
  | "entrega"
  | "transcripcion";

export interface Bloque {
  tipo: TipoBloque;
  etiqueta: string;
  texto: string;
  /** true si esta versión lo añade respecto de la anterior */
  nuevo: boolean;
}

export interface PromptArmado {
  bloques: Bloque[];
  texto: string;
  /** Capas activas sobre cuatro: instrucción, rol, restricciones, ejemplo */
  capas: number;
  palabrasTranscripcion: number;
  caracteres: number;
}

export const CAPAS_MAXIMAS = 4;

function contarPalabras(t: string): number {
  const limpio = t.trim();
  return limpio ? limpio.split(/\s+/).length : 0;
}

/** Las nueve restricciones. Van literales, no se reescriben. */
function bloqueRestricciones(detalle: number, tono: string): string {
  return (
    "Restricciones:\n" +
    "- No incluyas ningún requerimiento que no esté mencionado o directamente implícito en la transcripción.\n" +
    "- Si un tema quedó ambiguo, sin cerrar o aplazado, no lo conviertas en requerimiento: llévalo a la sección de preguntas abiertas.\n" +
    "- No declares como acordado ningún punto en el que las partes no llegaron a un acuerdo explícito.\n" +
    "- Si alguien reportó lo que desea un tercero que no participó en la reunión, no lo conviertas en requerimiento.\n" +
    "- No propongas cronogramas, fases ni duraciones.\n" +
    "- No inventes valores numéricos de retención, disponibilidad, tiempos de respuesta ni normativa que no se hayan mencionado.\n" +
    '- Cada requerimiento debe ir en una sola frase, redactado como "El sistema debe...".\n' +
    "- No uses cifras que el cliente no haya dado; si dio una cifra aproximada o la corrigió durante la reunión, consérvala como aproximada.\n" +
    (detalle === 0 ? "" : "- Extensión máxima: " + detalle + " palabras.\n") +
    "- Tono " + tono + "."
  );
}

export function construir(c: Config): PromptArmado {
  const cuerpo = c.transcripcion.trim()
    ? c.transcripcion.trim()
    : "[Aquí va la transcripción de la reunión]";

  // ---- v1: instrucción mínima, nada más -----------------------------------
  if (c.version === 1) {
    const bloques: Bloque[] = [
      {
        tipo: "instruccion",
        etiqueta: "instrucción",
        texto: "Convierte esta transcripción de reunión en un documento de requerimientos.",
        nuevo: false,
      },
      { tipo: "transcripcion", etiqueta: "transcripción", texto: cuerpo, nuevo: false },
    ];
    const texto = bloques.map((b) => b.texto).join("\n\n");
    return {
      bloques,
      texto,
      capas: 1,
      palabrasTranscripcion: contarPalabras(c.transcripcion),
      caracteres: texto.length,
    };
  }

  // ---- v2 y v3 -------------------------------------------------------------
  const activas = c.secciones.filter((s) => s.activa);
  let listado = activas
    .map((s, i) => {
      let n = i + 1 + ". " + s.nombre;
      if (s.pref) n += ", numerados como " + s.pref + "-01, " + s.pref + "-02, etc.";
      return n;
    })
    .join("\n");

  if (!listado) {
    listado = "1. Requerimientos funcionales, numerados como RF-01, RF-02, etc.";
  }

  const rol =
    "Actúa como analista de requerimientos de software con experiencia en " +
    (c.dominio.trim() || "sistemas empresariales") +
    ".";

  const tarea =
    "A partir de la siguiente transcripción de una reunión de levantamiento del " +
    (c.proyecto.trim() || "proyecto") +
    ", genera un documento de requerimientos que incluya como mínimo estas secciones, " +
    "en este orden. Puedes añadir secciones adicionales si la transcripción las justifica:\n\n" +
    listado;

  const entrega =
    "Entrega únicamente el documento terminado. No incluyas preámbulo, confirmaciones\n" +
    "sobre la tarea ni preguntas de aclaración: si falta información, resuélvela en la\n" +
    "sección de preguntas abiertas.";

  const referencia =
    "Formato de referencia:\n" +
    "Sigue exactamente la estructura, la numeración y el estilo de redacción del documento\n" +
    "de ejemplo que se incluye a continuación. Replica su formato de encabezados y el nivel\n" +
    "de detalle de sus requerimientos. Si hay conflicto entre el ejemplo y estas\n" +
    "instrucciones, manda el ejemplo.\n\n" +
    "Documento de ejemplo:\n" +
    (c.refdoc.trim() ? c.refdoc.trim() : "[FALTA: carga el documento de referencia]");

  const bloques: Bloque[] = [
    { tipo: "rol", etiqueta: "rol", texto: rol, nuevo: c.version === 2 },
    { tipo: "tarea", etiqueta: "tarea", texto: tarea, nuevo: c.version === 2 },
    {
      tipo: "restricciones",
      etiqueta: "restricciones",
      texto: bloqueRestricciones(c.detalle, c.tono),
      nuevo: c.version === 2,
    },
  ];

  if (c.version === 3) {
    bloques.push({
      tipo: "referencia",
      etiqueta: "ejemplo de formato",
      texto: referencia,
      nuevo: true,
    });
  }

  bloques.push({ tipo: "entrega", etiqueta: "entrega", texto: entrega, nuevo: c.version === 2 });
  bloques.push({
    tipo: "transcripcion",
    etiqueta: "transcripción",
    texto: "Transcripción:\n" + cuerpo,
    nuevo: false,
  });

  const texto = bloques.map((b) => b.texto).join("\n\n");

  return {
    bloques,
    texto,
    capas: c.version === 3 ? 4 : 3,
    palabrasTranscripcion: contarPalabras(c.transcripcion),
    caracteres: texto.length,
  };
}

/** Prompt de una de las seis partes, a partir del prompt base. */
export function promptDeParte(base: string, indice: number): string {
  return (
    base +
    "\n\nGenera ÚNICAMENTE esta parte del documento: " +
    PARTES[indice] +
    ".\n" +
    CIERRE_DE_PARTE
  );
}

/** En v3 el documento de referencia es obligatorio. */
export function faltaAlgo(c: Config): string | null {
  if (!c.transcripcion.trim()) return "Falta la transcripción";
  if (c.version === 3 && !c.refdoc.trim()) return "Falta el documento de referencia";
  return null;
}
