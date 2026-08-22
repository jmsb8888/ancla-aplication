import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useSesion } from "../../lib/sesion";
import { PantallaCargando } from "../../routes/Acceso";

/** Sin sesión no se entra. Se recuerda a dónde iba para volver ahí tras entrar. */
export function RutaProtegida({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useSesion();
  const ubicacion = useLocation();

  if (cargando) return <PantallaCargando />;
  if (!sesion) {
    return <Navigate to="/acceso" replace state={{ desde: ubicacion.pathname }} />;
  }
  return <>{children}</>;
}
