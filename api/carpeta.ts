/**
 * Creación de la carpeta de Drive de un proyecto.
 *
 * Va por una automatización distinta a la de subir documentos: aquí no viaja
 * ningún archivo, solo el nombre de la carpeta y la carpeta madre. Son dos
 * escenarios separados y no uno con bifurcación porque cada uno hace una sola
 * cosa, y así un fallo al archivar no arrastra al alta de proyectos.
 *
 * Se llama una vez por proyecto: quien decide si hace falta es la aplicación,
 * mirando si el proyecto ya tiene carpeta guardada. Esa es la garantía de que
 * no se creen carpetas repetidas con el mismo nombre.
 */
// La extensión .js es obligatoria: el paquete es "type": "module" y Node,
// que es quien ejecuta estas funciones en producción, exige la extensión en
// los imports relativos. TypeScript la resuelve igual al archivo .ts.
import { verificarSesion, type Peticion, type Respuesta } from "./_sesion.js";

interface Cuerpo {
  /** Nombre de la carpeta a crear. Normalmente el del proyecto. */
  nombre: string;
  /** Carpeta madre. Si no viene, la de reserva del entorno. */
  padre?: string;
}

export default async function handler(req: Peticion, res: Respuesta) {
  if (req.method !== "POST") return res.status(405).json({ error: "Solo POST" });

  const sesion = await verificarSesion(req);
  if (!sesion.ok) return res.status(401).json({ error: sesion.motivo });

  const { nombre, padre } = (req.body ?? {}) as Cuerpo;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "Falta el nombre de la carpeta" });
  }

  const webhook = process.env.AUTOMATION_CARPETA_WEBHOOK_URL;
  const secreto = process.env.AUTOMATION_SECRET;

  if (!webhook) {
    return res.status(503).json({
      error:
        "No hay automatización de carpetas configurada. Falta AUTOMATION_CARPETA_WEBHOOK_URL.",
    });
  }

  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secreto ? { "X-Webhook-Secret": secreto } : {}),
      },
      body: JSON.stringify({
        nombre: nombre.trim(),
        padre: (padre ?? "").trim() || process.env.DRIVE_CARPETA_POR_DEFECTO || "root",
        creadaPor: sesion.userId,
        creadaEn: new Date().toISOString(),
      }),
    });

    const texto = await r.text();

    if (!r.ok) {
      return res.status(502).json({
        error: `La automatización respondió ${r.status}: ${texto.slice(0, 200)}`,
      });
    }

    let id: string | null = null;
    let url: string | null = null;
    try {
      const datos = JSON.parse(texto) as { id?: string; url?: string; webViewLink?: string };
      id = datos.id ?? null;
      url = datos.url ?? datos.webViewLink ?? null;
    } catch {
      // Alguna automatización devuelve solo el id en texto plano.
      const limpio = texto.trim();
      if (/^[A-Za-z0-9_-]{10,}$/.test(limpio)) id = limpio;
    }

    if (!id) {
      return res.status(502).json({
        error: `La automatización no devolvió el id de la carpeta: ${texto.slice(0, 200)}`,
      });
    }

    return res.status(200).json({ id, url });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "No se pudo contactar la automatización.",
    });
  }
}
