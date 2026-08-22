import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Salvavidas } from "./Salvavidas";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  const [menu, setMenu] = useState(false);
  const ubicacion = useLocation();

  // Al cambiar de pantalla el menú se cierra solo: en móvil, dejarlo abierto
  // tapa justo lo que el usuario acaba de pedir.
  useEffect(() => {
    setMenu(false);
  }, [ubicacion.pathname]);

  useEffect(() => {
    if (!menu) return;
    const cerrar = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("keydown", cerrar);
    return () => document.removeEventListener("keydown", cerrar);
  }, [menu]);

  return (
    <div className="flex h-full">
      {/* Escritorio: barra fija. Móvil: cajón que entra por la izquierda. */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {menu && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenu(false)}
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
          />
          <div className="fixed inset-y-0 left-0 z-40 flex md:hidden">
            <Sidebar />
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-line bg-surface md:border-b-0">
          <button
            type="button"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menu}
            className="flex h-14 w-12 shrink-0 items-center justify-center text-muted hover:text-ink md:hidden"
          >
            {menu ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="min-w-0 flex-1">
            <Topbar />
          </div>
        </div>

        <main className="min-h-0 flex-1 overflow-auto">
          <Salvavidas>
            <Outlet />
          </Salvavidas>
        </main>
      </div>
    </div>
  );
}
