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

/**
 * Umbral de respaldo, medido y no elegido a ojo.
 *
 * Sobre una transcripción real de levantamiento (58 min, 1.190 palabras) y el
 * documento que salió de ella, los seis requerimientos legítimos puntuaron
 * entre 20 % y 46 %. Cinco requerimientos inventados a propósito
 * —notificaciones push, pasarela de pagos, biometría facial, ISO 27001,
 * solicitud de vacaciones— puntuaron entre 0 % y 29 %.
 *
 * Las dos franjas se solapan, y conviene saber por dónde: el inventado que
 * llega al 29 % es el de biometría facial, y llega ahí porque en la reunión sí
 * se habló de reconocimiento facial —para dejarlo fuera de alcance—. Esto mide
 * solapamiento de términos, no acuerdo: un requerimiento sobre algo rechazado
 * puntúa como uno sobre algo acordado. Por eso el resultado se le muestra al
 * analista y no decide solo.
 *
 * Con el 0,34 anterior el documento entero salía «0 % respaldado»: un aviso
 * que se dispara siempre no avisa de nada, y el analista aprende a ignorarlo.
 *
 * La calibración se hizo sobre una sola reunión. Si con más transcripciones
 * aparecen inventados por encima del 20 %, hay que subirlo: equivocarse
 * marcando de más solo cuesta una revisión; equivocarse marcando de menos deja
 * pasar un requerimiento que nadie pidió.
 */
export const UMBRAL = 0.2;

/**
 * Cuántas frases contiguas se miran a la vez.
 *
 * Un requerimiento redactado en formal casi nunca cabe en una sola frase de la
 * conversación: lo que en el documento es «el sistema debe validar la marca de
 * acceso contra el turno programado» en la reunión se dijo repartido entre la
 * queja, la pregunta del analista y la respuesta. Comparando frase a frase,
 * requerimientos perfectamente respaldados se quedaban en el 20-30 % y el
 * documento salía con «0 % respaldado», que es tan inútil como decir que todo
 * está bien.
 *
 * Tres es el intercambio típico —quien plantea, quien pregunta, quien
 * responde— y sigue siendo una ventana corta: no vale que los términos
 * aparezcan sueltos por toda la transcripción.
 */
const VENTANA = 3;

export function buscarRespaldo(requerimiento: string, transcripcion: string): Respaldo {
  const term = tokens(requerimiento);
  if (!term.length) return { puntaje: 0, cita: null, offset: null, respaldado: false };

  const fs = frases(transcripcion);
  let mejor = { puntaje: 0, cita: null as string | null, offset: null as number | null };

  for (let i = 0; i < fs.length; i++) {
    const acumulado = new Set<string>();
    for (let n = 0; n < VENTANA && i + n < fs.length; n++) {
      for (const t of tokens(fs[i + n].texto)) acumulado.add(t);
      if (!acumulado.size) continue;

      const comunes = term.filter((t) => acumulado.has(t)).length;
      const puntaje = comunes / term.length;
      if (puntaje > mejor.puntaje) {
        // Se cita la ventana entera: es lo que respalda el requerimiento, y
        // recortarla a una frase daría una cita que no sostiene lo que dice.
        mejor = {
          puntaje,
          cita: fs.slice(i, i + n + 1).map((f) => f.texto).join(" "),
          offset: fs[i].offset,
        };
      }
    }
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
