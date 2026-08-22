/**
 * Puente con la automatización de Drive desde el navegador.
 *
 * La aplicación nunca habla con Google: pide a sus propias funciones de
 * servidor, que son las que conocen el webhook y el secreto compartido.
 */
import { supabase } from "./supabase";

async function autorizacion(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

/**
 * Crea en Drive la carpeta del proyecto y devuelve su id.
 *
 * Quien llama decide cuándo hace falta: solo si el proyecto todavía no tiene
 * carpeta. Llamar dos veces con el mismo nombre crearía dos carpetas, porque
 * Drive permite nombres repetidos.
 */
export async function crearCarpetaDeProyecto(nombre: string): Promise<string> {
  const resp = await fetch("/api/carpeta", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await autorizacion()) },
    body: JSON.stringify({ nombre }),
  });

  const cuerpo = (await resp.json()) as { id?: string; error?: string };
  if (!resp.ok || !cuerpo.id) {
    throw new Error(cuerpo.error ?? "No se pudo crear la carpeta en Drive.");
  }
  return cuerpo.id;
}
