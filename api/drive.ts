/**
 * Envío del documento a Google Drive a través de una automatización.
 *
 * La aplicación no habla con Drive: manda el archivo a un webhook de Make o
 * n8n, que es quien lo deposita en la carpeta del proyecto. Así la
 * automatización se puede cambiar sin tocar el código, y el secreto compartido
 * no sale nunca del servidor.
 *
 * Se envía como `multipart/form-data` y no como JSON con base64: la
 * automatización recibe un archivo de verdad, sin tener que reconvertirlo del
 * otro lado, y viaja un tercio menos de datos.
 */
// La extensión .js es obligatoria: el paquete es "type": "module" y Node,
// que es quien ejecuta estas funciones en producción, exige la extensión en
// los imports relativos. TypeScript la resuelve igual al archivo .ts.
import { verificarSesion, type Peticion, type Respuesta } from "./_sesion.js";

interface Cuerpo {
  nombre: string;
  mime: string;
  contenido: string; // base64
  /** Carpeta de Drive del proyecto. Vacía = la automatización usa la suya. */
  carpeta?: string;
  metadatos?: Record<string, unknown>;
}

const LIMITE_BYTES = 8 * 1024 * 1024;

/**
 * El separador de líneas de multipart es CRLF y no admite otro. Va como
 * constante porque una plantilla de varias líneas en el código fuente se
 * normaliza a LF y el formulario queda malformado.
 */
const CRLF = "\r\n";

function construirFormulario(
  limite: string,
  campos: Record<string, string>,
  archivo: { nombre: string; mime: string; datos: Buffer },
): Buffer {
  const trozos: Buffer[] = [];

  for (const [nombre, valor] of Object.entries(campos)) {
    trozos.push(
      Buffer.from(
        "--" +
          limite +
          CRLF +
          'Content-Disposition: form-data; name="' +
          nombre +
          '"' +
          CRLF +
          CRLF +
          valor +
          CRLF,
      ),
    );
  }

  trozos.push(
    Buffer.from(
      "--" +
        limite +
        CRLF +
        'Content-Disposition: form-data; name="archivo"; filename="' +
        archivo.nombre +
        '"' +
        CRLF +
        "Content-Type: " +
        archivo.mime +
        CRLF +
        CRLF,
    ),
    archivo.datos,
    Buffer.from(CRLF + "--" + limite + "--" + CRLF),
  );

  return Buffer.concat(trozos);
}

export default async function handler(req: Peticion, res: Respuesta) {
  if (req.method !== "POST") return res.status(405).json({ error: "Solo POST" });

  const sesion = await verificarSesion(req);
  if (!sesion.ok) return res.status(401).json({ error: sesion.motivo });

  const { nombre, mime, contenido, carpeta, metadatos } = (req.body ?? {}) as Cuerpo;
  if (!nombre || !contenido) {
    return res.status(400).json({ error: "Faltan el nombre o el contenido del archivo" });
  }
  if (contenido.length * 0.75 > LIMITE_BYTES) {
    return res.status(413).json({ error: "El archivo supera los 8 MB" });
  }

  const webhook = process.env.AUTOMATION_WEBHOOK_URL;
  const secreto = process.env.AUTOMATION_SECRET;

  if (!webhook) {
    return res.status(503).json({
      error:
        "No hay automatización configurada. Falta AUTOMATION_WEBHOOK_URL con el webhook de Make o n8n.",
    });
  }

  const campos: Record<string, string> = {
    nombre,
    mime: mime || "application/pdf",
    // Si el proyecto no tiene carpeta, se manda la de reserva. La condición
    // vive aquí y no en una expresión de la automatización: es más fácil de
    // leer, de probar y de cambiar.
    carpeta: (carpeta ?? "").trim() || process.env.DRIVE_CARPETA_POR_DEFECTO || "root",
    enviadoPor: sesion.userId,
    enviadoEn: new Date().toISOString(),
  };
  for (const [k, v] of Object.entries(metadatos ?? {})) campos[k] = String(v);

  const limite = "----ancla" + Math.random().toString(36).slice(2);
  const formulario = construirFormulario(limite, campos, {
    nombre,
    mime: mime || "application/pdf",
    datos: Buffer.from(contenido, "base64"),
  });

  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data; boundary=" + limite,
        ...(secreto ? { "X-Webhook-Secret": secreto } : {}),
      },
      body: formulario,
    });

    const texto = await r.text();

    if (!r.ok) {
      return res.status(502).json({
        error: `La automatización respondió ${r.status}: ${texto.slice(0, 200)}`,
      });
    }

    // Make y n8n pueden responder JSON o texto plano con la URL.
    let url: string | null = null;
    try {
      const datos = JSON.parse(texto) as { url?: string; webViewLink?: string };
      url = datos.url ?? datos.webViewLink ?? null;
    } catch {
      const m = texto.match(/https?:\/\/\S+/);
      url = m ? m[0] : null;
    }

    return res.status(200).json({ url, respuesta: texto.slice(0, 500) });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "No se pudo contactar la automatización.",
    });
  }
}
