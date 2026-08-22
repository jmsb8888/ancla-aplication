import { PARTES, promptDeParte } from "./prompt";
import type { ModoGeneracion } from "./modelos";
import { supabase } from "./supabase";

export type EstadoParte = "pendiente" | "corriendo" | "lista" | "error";

export interface Parte {
  indice: number;
  descripcion: string;
  estado: EstadoParte;
  texto: string;
  error?: string;
  duracionMs?: number;
}

export interface ProgresoGeneracion {
  partes: Parte[];
  /** Texto acumulado hasta ahora, en orden */
  documento: string;
  simulado: boolean;
  terminado: boolean;
}

export interface OpcionesModelo {
  modelo?: string;
  temperatura?: number;
  topP?: number;
  maxTokens?: number;
}

/** En modo completo hay un solo "paso": el documento entero. */
export function partesIniciales(modo: ModoGeneracion = "troceado"): Parte[] {
  if (modo === "completo") {
    return [
      { indice: 0, descripcion: "el documento completo", estado: "pendiente", texto: "" },
    ];
  }
  return PARTES.map((d, i) => ({
    indice: i,
    descripcion: d,
    estado: "pendiente" as EstadoParte,
    texto: "",
  }));
}

async function llamar(
  prompt: string,
  opciones: OpcionesModelo,
): Promise<{ texto: string; simulado: boolean; duracionMs: number }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const r = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ prompt, ...opciones }),
  });

  const cuerpo = (await r.json()) as {
    texto?: string;
    simulado?: boolean;
    duracionMs?: number;
    error?: string;
  };

  if (!r.ok) throw new Error(cuerpo.error ?? `El servidor respondió ${r.status}`);
  return {
    texto: cuerpo.texto ?? "",
    simulado: !!cuerpo.simulado,
    duracionMs: cuerpo.duracionMs ?? 0,
  };
}

/**
 * Ejecuta las seis llamadas en orden y va avisando del avance. Si una parte
 * falla, las anteriores se conservan: el documento queda parcial, no perdido.
 */
export async function generarDocumento(
  promptBase: string,
  opciones: OpcionesModelo,
  alAvanzar: (p: ProgresoGeneracion) => void,
  soloEstas?: number[],
  partesPrevias?: Parte[],
  modo: ModoGeneracion = "completo",
): Promise<ProgresoGeneracion> {
  const partes = partesPrevias ? partesPrevias.map((p) => ({ ...p })) : partesIniciales(modo);
  const objetivo = soloEstas ?? partes.map((p) => p.indice);
  let simulado = false;

  const avisar = (terminado = false) =>
    alAvanzar({
      partes: partes.map((p) => ({ ...p })),
      documento: partes
        .filter((p) => p.estado === "lista")
        .map((p) => p.texto)
        .join("\n\n"),
      simulado,
      terminado,
    });

  for (const indice of objetivo) {
    const parte = partes[indice];
    parte.estado = "corriendo";
    parte.error = undefined;
    avisar();

    try {
      // En modo completo el prompt base ya pide el documento entero: no hay
      // instrucción de recorte que añadir.
      const prompt = modo === "completo" ? promptBase : promptDeParte(promptBase, indice);
      const r = await llamar(prompt, opciones);
      parte.texto = r.texto;
      parte.estado = "lista";
      parte.duracionMs = r.duracionMs;
      simulado = simulado || r.simulado;
    } catch (e) {
      parte.estado = "error";
      parte.error = e instanceof Error ? e.message : "Error desconocido";
    }
    avisar();
  }

  const resultado: ProgresoGeneracion = {
    partes: partes.map((p) => ({ ...p })),
    documento: partes
      .filter((p) => p.estado === "lista")
      .map((p) => p.texto)
      .join("\n\n"),
    simulado,
    terminado: true,
  };
  alAvanzar(resultado);
  return resultado;
}

/** Métricas que se guardan junto al documento. */
export function medir(documento: string, partes: Parte[]) {
  const rf = (documento.match(/\bRF-\d+/g) ?? []).length;
  const rnf = (documento.match(/\bRNF-\d+/g) ?? []).length;
  const palabras = documento.trim() ? documento.trim().split(/\s+/).length : 0;
  const duracion = partes.reduce((a, p) => a + (p.duracionMs ?? 0), 0);
  return {
    n_palabras: palabras,
    n_rf: new Set(documento.match(/\bRF-\d+/g) ?? []).size || rf,
    n_rnf: new Set(documento.match(/\bRNF-\d+/g) ?? []).size || rnf,
    duracion_ms: duracion,
    llamadas: partes.filter((p) => p.estado === "lista").length,
    partes_con_error: partes.filter((p) => p.estado === "error").length,
  };
}
