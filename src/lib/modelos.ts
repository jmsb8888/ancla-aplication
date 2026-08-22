/**
 * Modelos disponibles y modo de generación.
 *
 * El troceado en seis llamadas venía de una limitación del entorno del
 * prototipo: 1.000 tokens por respuesta. Los modelos actuales devuelven hasta
 * 65.536, así que el documento entero cabe en una sola llamada. Se conservan
 * los dos modos para poder medirlos y sostener la decisión con datos.
 */

export interface Modelo {
  id: string;
  nombre: string;
  nota: string;
}

/** Verificado en la documentación de Google el 21/08/2026. */
export const MODELOS: Modelo[] = [
  {
    id: "gemini-3.6-flash",
    nombre: "Gemini 3.6 Flash",
    nota: "el más reciente estable · mejor calidad",
  },
  {
    id: "gemini-3.5-flash-lite",
    nombre: "Gemini 3.5 Flash-Lite",
    nota: "más rápido y económico · gasta menos cuota",
  },
  {
    id: "gemini-2.5-flash",
    nombre: "Gemini 2.5 Flash",
    nota: "generación anterior · para comparar",
  },
];

export const MODELO_POR_DEFECTO = MODELOS[0].id;

/** Salida máxima por respuesta de los modelos Flash actuales. */
export const TOPE_SALIDA = 65536;

export type ModoGeneracion = "completo" | "troceado";

export const MODOS: { id: ModoGeneracion; nombre: string; nota: string; llamadas: string }[] = [
  {
    id: "completo",
    nombre: "Una llamada",
    nota: "el documento entero de una vez",
    llamadas: "1 llamada",
  },
  {
    id: "troceado",
    nombre: "Seis partes",
    nota: "una llamada por bloque, como en la Fase 1",
    llamadas: "6 llamadas · ~6× tokens de entrada",
  },
];
