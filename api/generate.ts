/**
 * Llama al modelo. La API key vive solo aquí, en el servidor: nunca llega al
 * navegador. Si algún día hiciera falta en el cliente, el diseño está mal.
 */
// La extensión .js es obligatoria: el paquete es "type": "module" y Node,
// que es quien ejecuta estas funciones en producción, exige la extensión en
// los imports relativos. TypeScript la resuelve igual al archivo .ts.
import { verificarSesion, type Peticion, type Respuesta } from "./_sesion.js";

const URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface Cuerpo {
  prompt: string;
  modelo?: string;
  temperatura?: number;
  topP?: number;
  maxTokens?: number;
}

/**
 * Sin API key configurada no se inventa una respuesta en producción: se avisa.
 * En desarrollo sí se simula, para poder construir y probar el flujo completo
 * antes de tener la clave. La simulación se marca visiblemente.
 */
function simular(prompt: string): string {
  const parte = prompt.match(/Genera ÚNICAMENTE esta parte del documento: ([^.]+)/)?.[1] ?? "";
  return (
    `## [SIMULACIÓN] ${parte.slice(0, 70)}\n\n` +
    "Respuesta simulada: no hay `GEMINI_API_KEY` configurada, así que el servidor " +
    "devuelve este texto para poder probar el flujo de las seis partes sin gastar cuota.\n\n" +
    "- RF-01 | El sistema debe validar la entrada del personal contra el turno asignado.\n" +
    "- RF-02 | El sistema debe registrar cada apertura manual con usuario y hora.\n" +
    "- RNF-01 | Disponibilidad | El módulo debe operar en las tres porterías.\n"
  );
}

export default async function handler(req: Peticion, res: Respuesta) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Solo POST" });
  }

  const sesion = await verificarSesion(req);
  if (!sesion.ok) {
    return res.status(401).json({ error: sesion.motivo });
  }

  const { prompt, modelo, temperatura, topP, maxTokens } = (req.body ?? {}) as Cuerpo;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Falta el prompt" });
  }

  const key = process.env.GEMINI_API_KEY;
  const arranque = Date.now();

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({
        error: "El servidor no tiene configurada la API key de Google.",
      });
    }
    return res.status(200).json({
      texto: simular(prompt),
      simulado: true,
      duracionMs: Date.now() - arranque,
    });
  }

  const nombreModelo = modelo || process.env.GEMINI_MODEL || "gemini-3.6-flash";

  try {
    const r = await fetch(`${URL_BASE}/${encodeURIComponent(nombreModelo)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: temperatura ?? 0.2,
          topP: topP ?? 0.9,
          maxOutputTokens: maxTokens ?? 4096,
        },
      }),
    });

    const datos = (await r.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      error?: { message?: string };
    };

    if (!r.ok) {
      return res.status(r.status).json({
        error: datos.error?.message ?? `El modelo respondió ${r.status}`,
      });
    }

    const texto = (datos.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .filter(Boolean)
      .join("\n");

    if (!texto.trim()) {
      return res.status(502).json({ error: "El modelo devolvió una respuesta vacía." });
    }

    return res.status(200).json({
      texto,
      simulado: false,
      modelo: nombreModelo,
      tokensEntrada: datos.usageMetadata?.promptTokenCount ?? null,
      tokensSalida: datos.usageMetadata?.candidatesTokenCount ?? null,
      duracionMs: Date.now() - arranque,
    });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "No se pudo contactar al modelo.",
    });
  }
}
