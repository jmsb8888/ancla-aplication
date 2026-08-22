import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface Contexto {
  sesion: Session | null;
  usuario: User | null;
  cargando: boolean;
  entrar: (correo: string, clave: string) => Promise<void>;
  registrar: (correo: string, clave: string, nombre: string) => Promise<{ confirmar: boolean }>;
  salir: () => Promise<void>;
}

const SesionCtx = createContext<Contexto | null>(null);

/** Traduce los errores de Supabase, que llegan en inglés y sin contexto. */
function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Falta confirmar el correo. Revisa tu bandeja.";
  if (m.includes("user already registered")) return "Ese correo ya tiene una cuenta.";
  if (m.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("unable to validate email address")) return "El correo no es válido.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espera un momento.";
  if (m.includes("fetch")) return "No hay conexión con el servidor.";
  return mensaje;
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const valor = useMemo<Contexto>(
    () => ({
      sesion,
      usuario: sesion?.user ?? null,
      cargando,
      async entrar(correo, clave) {
        const { error } = await supabase.auth.signInWithPassword({
          email: correo.trim(),
          password: clave,
        });
        if (error) throw new Error(traducir(error.message));
      },
      async registrar(correo, clave, nombre) {
        const { data, error } = await supabase.auth.signUp({
          email: correo.trim(),
          password: clave,
          options: { data: { nombre: nombre.trim() } },
        });
        if (error) throw new Error(traducir(error.message));
        // Si el proyecto exige confirmar el correo, no llega sesión todavía.
        return { confirmar: !data.session };
      },
      async salir() {
        await supabase.auth.signOut();
      },
    }),
    [sesion, cargando],
  );

  return <SesionCtx.Provider value={valor}>{children}</SesionCtx.Provider>;
}

export function useSesion(): Contexto {
  const ctx = useContext(SesionCtx);
  if (!ctx) throw new Error("useSesion debe usarse dentro de ProveedorSesion");
  return ctx;
}
