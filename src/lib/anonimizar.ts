/**
 * Anonimizador determinista.
 *
 * En la Fase 1 este trabajo se hacía a mano antes de pegar la transcripción.
 * Aquí se automatiza en dos pasadas: esta, con reglas fijas y resultado
 * reproducible, y una segunda semántica con el modelo (en `/api/anonimizar`)
 * para lo que las reglas no alcanzan.
 *
 * El mapa de sustituciones vive en memoria y nunca se guarda: es la única
 * pieza que permitiría revertir la anonimización.
 */

export type TipoEntidad =
  | "persona"
  | "empresa"
  | "correo"
  | "telefono"
  | "documento"
  | "url"
  | "codigo";

export interface Sustitucion {
  /** Texto tal como aparece en la transcripción */
  original: string;
  /** Etiqueta que lo reemplaza: [PERSONA_1], [CORREO_2]… */
  reemplazo: string;
  tipo: TipoEntidad;
  /** Cuántas veces aparece en el texto */
  ocurrencias: number;
  /** Posición de la primera aparición, para poder resaltarla */
  primerOffset: number;
  origen: "reglas" | "modelo";
  aceptada: boolean;
}

export const ETIQUETAS: Record<TipoEntidad, string> = {
  persona: "PERSONA",
  empresa: "CLIENTE",
  correo: "CORREO",
  telefono: "TELEFONO",
  documento: "DOCUMENTO",
  url: "URL",
  codigo: "CODIGO",
};

export const NOMBRES_TIPO: Record<TipoEntidad, string> = {
  persona: "Nombre de persona",
  empresa: "Nombre de empresa",
  correo: "Correo electrónico",
  telefono: "Teléfono",
  documento: "Cédula o NIT",
  url: "Enlace",
  codigo: "Código de contrato u orden",
};

/** Palabras que empiezan frase o son cargos: no son nombres propios. */
const NO_SON_NOMBRES = new Set([
  "el", "la", "los", "las", "un", "una", "y", "o", "pero", "si", "no", "que",
  "cliente", "usuario", "sistema", "proyecto", "reunión", "reunion", "acta",
  "ingeniero", "ingeniera", "gerente", "director", "directora", "analista",
  "señor", "señora", "doctor", "doctora", "bueno", "entonces", "listo", "vale",
  "ok", "sí", "si", "gracias", "hola", "buenas", "perfecto", "claro", "además",
  "ahora", "después", "también", "por", "para", "con", "sin", "desde", "hasta",
]);

interface Regla {
  tipo: TipoEntidad;
  patron: RegExp;
  /** Grupo de captura que contiene el valor a sustituir (1 por defecto) */
  grupo?: number;
}

const REGLAS: Regla[] = [
  // El enlace va primero: contiene puntos y barras que confundirían al resto.
  { tipo: "url", patron: /https?:\/\/[^\s<>"'()]+/g, grupo: 0 },
  { tipo: "correo", patron: /[\w.%+-]+@[\w-]+\.[\w.]{2,}/g, grupo: 0 },

  // NIT con dígito de verificación: 900123456-7
  { tipo: "documento", patron: /\b\d{9,10}-\d\b/g, grupo: 0 },
  // Cédula escrita con puntos: 1.032.456.789
  { tipo: "documento", patron: /\b\d{1,3}(?:\.\d{3}){2,3}\b/g, grupo: 0 },
  // Documento anunciado por su nombre: "cédula 1032456789"
  {
    tipo: "documento",
    patron: /\b(?:c[eé]dula|c\.?c\.?|nit)\s*:?\s*(\d[\d.\s-]{5,14}\d)/gi,
    grupo: 1,
  },

  // Celular colombiano, con o sin indicativo
  { tipo: "telefono", patron: /(?:\+?57[\s-]?)?\b3\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g, grupo: 0 },
  // Fijo con indicativo: (601) 123 4567
  { tipo: "telefono", patron: /\(\d{1,3}\)\s?\d{3}[\s-]?\d{4}\b/g, grupo: 0 },

  // Contratos y órdenes: OC-4471, CTR 209
  { tipo: "codigo", patron: /\b(?:OC|OS|CTR?|ORD|PO)[-\s]?\d{3,}\b/gi, grupo: 0 },

  // Persona anunciada por su tratamiento
  {
    tipo: "persona",
    patron:
      /\b(?:Sr\.?|Sra\.?|Srta\.?|Ing\.?|Dr\.?|Dra\.?|don|doña)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})/g,
    grupo: 1,
  },

  // Empresa por su forma jurídica: Nestlé S.A.S., Acme Ltda.
  {
    tipo: "empresa",
    patron:
      /\b([A-ZÁÉÍÓÚÑ][\wáéíóúñÁÉÍÓÚÑ&.]*(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñÁÉÍÓÚÑ&.]*){0,3})\s+(?:S\.?A\.?S\.?|S\.?A\.?|Ltda\.?|S\.?A\.?S|E\.?U\.?)\b/g,
    grupo: 0,
  },
];

/**
 * Etiqueta de hablante al inicio de línea. Es la señal más fiable en una
 * transcripción: "Marcela:", "[00:12:04] Juan Pérez:".
 */
const HABLANTE =
  /^[ \t]*(?:\[[^\]]{1,20}\]\s*)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3})\s*:/gm;

function esNombrePlausible(s: string): boolean {
  const palabras = s.trim().split(/\s+/);
  if (palabras.length > 4) return false;
  return !palabras.every((p) => NO_SON_NOMBRES.has(p.toLowerCase()));
}

/** Escapa un texto para usarlo dentro de una expresión regular. */
function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contar(texto: string, aguja: string): number {
  const re = new RegExp(escapar(aguja), "g");
  return (texto.match(re) ?? []).length;
}

/**
 * Primera pasada: reglas fijas. Mismo texto de entrada, mismo resultado.
 */
export function detectarConReglas(texto: string): Sustitucion[] {
  const encontrados = new Map<string, Sustitucion>();
  const contadores: Partial<Record<TipoEntidad, number>> = {};

  function registrar(valor: string, tipo: TipoEntidad, offset: number) {
    const limpio = valor.trim().replace(/[.,;:]$/, "");
    if (limpio.length < 3) return;
    if (encontrados.has(limpio)) return;
    // Si ya se detectó como parte de otra entidad más larga, no se duplica.
    for (const s of encontrados.values()) {
      if (s.original.includes(limpio)) return;
    }
    const n = (contadores[tipo] ?? 0) + 1;
    contadores[tipo] = n;
    encontrados.set(limpio, {
      original: limpio,
      reemplazo: `[${ETIQUETAS[tipo]}_${n}]`,
      tipo,
      ocurrencias: contar(texto, limpio),
      primerOffset: offset,
      origen: "reglas",
      aceptada: true,
    });
  }

  // Los hablantes primero: dan los nombres que luego aparecen sueltos.
  for (const m of texto.matchAll(HABLANTE)) {
    const nombre = m[1];
    if (nombre && esNombrePlausible(nombre)) {
      registrar(nombre, "persona", m.index ?? 0);
    }
  }

  for (const regla of REGLAS) {
    for (const m of texto.matchAll(regla.patron)) {
      const valor = m[regla.grupo ?? 1] ?? m[0];
      if (!valor) continue;
      if (regla.tipo === "persona" || regla.tipo === "empresa") {
        if (!esNombrePlausible(valor)) continue;
      }
      registrar(valor, regla.tipo, m.index ?? 0);
    }
  }

  return [...encontrados.values()].sort((a, b) => a.primerOffset - b.primerOffset);
}

/**
 * Aplica las sustituciones aceptadas. De la más larga a la más corta, para que
 * un nombre contenido en otro no rompa el reemplazo.
 */
export function aplicar(texto: string, subs: Sustitucion[]): string {
  const activas = subs
    .filter((s) => s.aceptada)
    .sort((a, b) => b.original.length - a.original.length);

  let salida = texto;
  for (const s of activas) {
    salida = salida.replace(new RegExp(escapar(s.original), "g"), s.reemplazo);
  }
  return salida;
}

export function resumen(subs: Sustitucion[]): { tipo: TipoEntidad; cuantas: number }[] {
  const cuenta = new Map<TipoEntidad, number>();
  for (const s of subs.filter((x) => x.aceptada)) {
    cuenta.set(s.tipo, (cuenta.get(s.tipo) ?? 0) + 1);
  }
  return [...cuenta.entries()].map(([tipo, cuantas]) => ({ tipo, cuantas }));
}

/** ¿Queda algo identificable evidente sin sustituir? Chequeo de seguridad. */
export function quedaAlgoSinRevisar(texto: string): boolean {
  return /[\w.%+-]+@[\w-]+\.[\w.]{2,}/.test(texto) || /\b3\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/.test(texto);
}


/**
 * Fusiona las propuestas del modelo con lo ya detectado por reglas, sin
 * duplicar y continuando la numeración de cada tipo.
 */
export function fusionarPropuestas(
  texto: string,
  actuales: Sustitucion[],
  propuestas: { original: string; tipo: string }[],
): Sustitucion[] {
  const salida = [...actuales];
  const contadores: Partial<Record<TipoEntidad, number>> = {};
  for (const s of salida) {
    contadores[s.tipo] = Math.max(
      contadores[s.tipo] ?? 0,
      Number(s.reemplazo.match(/_(\d+)\]$/)?.[1] ?? 0),
    );
  }

  for (const prop of propuestas) {
    const valor = prop.original.trim();
    if (valor.length < 3) continue;
    if (salida.some((s) => s.original === valor || s.original.includes(valor))) continue;
    if (!texto.includes(valor)) continue;

    const tipo: TipoEntidad = prop.tipo === "empresa" ? "empresa" : "persona";
    const n = (contadores[tipo] ?? 0) + 1;
    contadores[tipo] = n;

    salida.push({
      original: valor,
      reemplazo: `[${ETIQUETAS[tipo]}_${n}]`,
      tipo,
      ocurrencias: contar(texto, valor),
      primerOffset: texto.indexOf(valor),
      origen: "modelo",
      aceptada: true,
    });
  }

  return salida.sort((a, b) => a.primerOffset - b.primerOffset);
}

/** Pide al servidor la pasada semántica. Nunca aplica nada por su cuenta. */
export async function proponerConModelo(
  texto: string,
  token?: string,
): Promise<{ propuestas: { original: string; tipo: string }[]; simulado: boolean }> {
  const r = await fetch("/api/anonimizar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ texto }),
  });
  const datos = (await r.json()) as {
    propuestas?: { original: string; tipo: string }[];
    simulado?: boolean;
    error?: string;
  };
  if (!r.ok) throw new Error(datos.error ?? `El servidor respondió ${r.status}`);
  return { propuestas: datos.propuestas ?? [], simulado: !!datos.simulado };
}
