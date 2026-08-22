import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * La barra superior dice dónde estás, no cómo se llama el producto: el nombre
 * ya está en la barra lateral y repetirlo en cada pantalla es espacio perdido.
 * Cada pantalla declara su título; el detalle de una reunión pone el suyo
 * cuando llegan los datos.
 */
interface Contexto {
  titulo: string;
  detalle: string | null;
  poner: (titulo: string, detalle?: string | null) => void;
}

const Ctx = createContext<Contexto | null>(null);

export function ProveedorTitulo({ children }: { children: ReactNode }) {
  const [titulo, setTitulo] = useState("Reuniones");
  const [detalle, setDetalle] = useState<string | null>(null);

  return (
    <Ctx.Provider
      value={{
        titulo,
        detalle,
        poner: (t, d = null) => {
          setTitulo(t);
          setDetalle(d);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useBarraTitulo(): Contexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBarraTitulo debe usarse dentro de ProveedorTitulo");
  return ctx;
}

/** Azúcar para las pantallas: declara el título mientras esté montada. */
export function useTitulo(titulo: string, detalle?: string | null) {
  const { poner } = useBarraTitulo();
  useEffect(() => {
    poner(titulo, detalle ?? null);
  }, [titulo, detalle, poner]);
}
