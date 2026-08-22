/**
 * Verificación de sesión para las funciones de servidor.
 *
 * Un endpoint abierto que llame al modelo con la key del proyecto es una
 * factura esperando a pasar: aquí se exige un token válido de Supabase.
 */

export interface Peticion {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

export interface Respuesta {
  status: (codigo: number) => Respuesta;
  json: (cuerpo: unknown) => void;
}

export type Sesion = { ok: true; userId: string } | { ok: false; motivo: string };

function cabecera(req: Peticion, nombre: string): string | undefined {
  const v = req.headers[nombre] ?? req.headers[nombre.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

export async function verificarSesion(req: Peticion): Promise<Sesion> {
  const auth = cabecera(req, "authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!token) {
    // En desarrollo se permite trabajar sin sesión mientras se construye.
    if (process.env.NODE_ENV !== "production") {
      return { ok: true, userId: "desarrollo" };
    }
    return { ok: false, motivo: "Falta iniciar sesión." };
  }

  if (!url || !anon) {
    return { ok: false, motivo: "El servidor no tiene configurado Supabase." };
  }

  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!r.ok) return { ok: false, motivo: "La sesión no es válida o expiró." };
    const usuario = (await r.json()) as { id?: string };
    if (!usuario.id) return { ok: false, motivo: "La sesión no es válida." };
    return { ok: true, userId: usuario.id };
  } catch {
    return { ok: false, motivo: "No se pudo verificar la sesión." };
  }
}
