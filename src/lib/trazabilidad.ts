/**
 * Trazabilidad: ¿cada requerimiento tiene respaldo en lo que se dijo?
 *
 * No se le pide al modelo que "cite": eso es justo lo que un modelo puede
 * inventar. Se hace al revés — se busca en la transcripción la frase que más
 * comparte con el requerimiento y se mide cuánto. Un requerimiento sin frase
 * que lo respalde queda marcado, y el usuario decide.
 *
 * Es una comprobación, no una prueba: por eso la interfaz dice "coincidencia
 * con la transcripción" y no "fuente citada".
 */

const VACIAS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a",
  "en", "y", "o", "que", "se", "su", "sus", "por", "para", "con", "sin", "como",
  "es", "son", "ser", "debe", "deben", "sistema", "usuario", "cada", "este",
  "esta", "estos", "estas", "lo", "le", "les", "no", "si", "más", "menos", "ya",
  "cuando", "donde", "desde", "hasta", "sobre", "entre", "todo", "toda", "hay",
]);

function tokens(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3 && !VACIAS.has(t));
}

/** Corta la transcripción en frases con su posición original. */
export function frases(transcripcion: string): { texto: string; offset: number }[] {
  const salida: { texto: string; offset: number }[] = [];
  const re = /[^.!?\n]+[.!?]?/g;
  for (const m of transcripcion.matchAll(re)) {
    const t = m[0].trim();
    if (t.length > 25) salida.push({ texto: t, offset: m.index ?? 0 });
  }
  return salida;
}

export interface Respaldo {
  /** 0 a 1: proporción de términos del requerimiento presentes en la frase */
  puntaje: number;
  cita: string | null;
  offset: number | null;
  /** Por encima de este puntaje se considera respaldado */
  respaldado: boolean;
}

export const UMBRAL = 0.34;

export function buscarRespaldo(requerimiento: string, transcripcion: string): Respaldo {
  const term = tokens(requerimiento);
  if (!term.length) return { puntaje: 0, cita: null, offset: null, respaldado: false };

  let mejor = { puntaje: 0, cita: null as string | null, offset: null as number | null };

  for (const f of frases(transcripcion)) {
    const enFrase = new Set(tokens(f.texto));
    if (!enFrase.size) continue;
    const comunes = term.filter((t) => enFrase.has(t)).length;
    const puntaje = comunes / term.length;
    if (puntaje > mejor.puntaje) mejor = { puntaje, cita: f.texto, offset: f.offset };
  }

  return { ...mejor, respaldado: mejor.puntaje >= UMBRAL };
}

export interface RequerimientoVerificado {
  codigo: string;
  tipo: "RF" | "RNF";
  texto: string;
  respaldo: Respaldo;
}

/** Extrae los requerimientos del documento y los verifica uno por uno. */
export function verificarDocumento(
  contenidoMd: string,
  transcripcion: string,
): RequerimientoVerificado[] {
  const salida: RequerimientoVerificado[] = [];
  const vistos = new Set<string>();

  for (const linea of contenidoMd.split("\n")) {
    const m = linea.match(/\b(RNF|RF)-(\d+)\b/);
    if (!m) continue;
    const codigo = `${m[1]}-${m[2]}`;
    if (vistos.has(codigo)) continue;

    const texto = linea
      .replace(/^[|\s\-*]*/, "")
      .replace(/\|/g, " · ")
      .replace(/\s+/g, " ")
      .trim();
    if (texto.length < 15) continue;

    vistos.add(codigo);
    salida.push({
      codigo,
      tipo: m[1] as "RF" | "RNF",
      texto,
      respaldo: buscarRespaldo(texto, transcripcion),
    });
  }

  return salida;
}

/** Porcentaje de requerimientos con respaldo, para la cabecera del documento. */
export function porcentajeRespaldado(reqs: RequerimientoVerificado[]): number {
  if (!reqs.length) return 0;
  return Math.round((reqs.filter((r) => r.respaldo.respaldado).length / reqs.length) * 100);
}
