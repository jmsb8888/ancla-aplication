/**
 * Segunda pasada del anonimizador: lo que las reglas no alcanzan.
 *
 * Las reglas cogen correos, teléfonos y documentos porque tienen forma fija.
 * Los nombres de persona y de empresa sin forma jurídica dependen del contexto,
 * y ahí entra el modelo. Devuelve propuestas, no cambios: el usuario decide.
 */
import { verificarSesion, type Peticion, type Respuesta } from "./_sesion";

const URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface Propuesta {
  original: string;
  tipo: "persona" | "empresa" | "cargo" | "lugar";
}

const INSTRUCCION = `Eres un revisor de privacidad. Recibes la transcripción de una reunión de trabajo.

Tu tarea es listar únicamente las expresiones que identifican a personas u organizaciones concretas:
nombres propios de personas, nombres de empresas o clientes, y cargos que junto al contexto permitan
identificar a alguien.

Reglas:
- No incluyas correos, teléfonos, cédulas, NIT ni enlaces: esos ya se detectaron por otra vía.
- No incluyas nombres de productos, tecnologías, ciudades genéricas ni cargos comunes sin nombre.
- No inventes: solo lo que aparece literalmente en el texto.
- Devuelve exclusivamente un arreglo JSON, sin explicación ni markdown, con esta forma:
[{"original":"texto exacto","tipo":"persona|empresa|cargo|lugar"}]

Transcripción:
`;

function extraerJson(texto: string): Propuesta[] {
  const limpio = texto.replace(/```json|```/g, "").trim();
  const ini = limpio.indexOf("[");
  const fin = limpio.lastIndexOf("]");
  if (ini === -1 || fin === -1) return [];
  try {
    const datos = JSON.parse(limpio.slice(ini, fin + 1)) as Propuesta[];
    return Array.isArray(datos)
      ? datos.filter((p) => p && typeof p.original === "string" && p.original.trim().length > 2)
      : [];
  } catch {
    return [];
  }
}

export default async function handler(req: Peticion, res: Respuesta) {
  if (req.method !== "POST") return res.status(405).json({ error: "Solo POST" });

  const sesion = await verificarSesion(req);
  if (!sesion.ok) return res.status(401).json({ error: sesion.motivo });

  const { texto } = (req.body ?? {}) as { texto?: string };
  if (!texto || typeof texto !== "string") {
    return res.status(400).json({ error: "Falta el texto" });
  }

  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({ error: "El servidor no tiene configurada la API key." });
    }
    // En desarrollo se devuelve vacío: mejor no proponer nada que fingir hallazgos.
    return res.status(200).json({ propuestas: [], simulado: true });
  }

  // El anonimizado es una tarea de extracción: el modelo ligero basta y gasta menos.
  const modelo = process.env.GEMINI_MODEL_LIGERO || "gemini-3.5-flash-lite";

  try {
    const r = await fetch(`${URL_BASE}/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: INSTRUCCION + texto.slice(0, 40000) }] }],
        // Temperatura mínima: aquí no queremos creatividad, queremos literalidad.
        generationConfig: { temperature: 0, maxOutputTokens: 2048 },
      }),
    });

    const datos = (await r.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };

    if (!r.ok) {
      return res.status(r.status).json({ error: datos.error?.message ?? `Error ${r.status}` });
    }

    const salida = (datos.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("");

    const propuestas = extraerJson(salida)
      // Solo lo que de verdad está en el texto: descarta cualquier invención.
      .filter((p) => texto.includes(p.original));

    return res.status(200).json({ propuestas, simulado: false });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "No se pudo contactar al modelo.",
    });
  }
}
