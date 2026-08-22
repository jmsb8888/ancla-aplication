import { useEffect, useRef, useState } from "react";
import { LogOut, Moon, Sun, UserRound } from "lucide-react";
import { aplicarTema, temaGuardado, type Tema } from "../../lib/theme";
import { useSesion } from "../../lib/sesion";
import { useBarraTitulo } from "../../lib/titulo";

export function Topbar() {
  const [tema, setTema] = useState<Tema>(() => temaGuardado());
  const [menu, setMenu] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const { usuario, salir } = useSesion();
  const { titulo, detalle } = useBarraTitulo();

  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  useEffect(() => {
    if (!menu) return;
    function fuera(e: MouseEvent) {
      if (caja.current && !caja.current.contains(e.target as Node)) setMenu(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(false);
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);

  const correo = usuario?.email ?? "";
  const nombre =
    (usuario?.user_metadata?.nombre as string | undefined) ||
    correo.split("@")[0] ||
    "invitado";

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-5">
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold text-ink">{titulo}</h1>
        {detalle && <p className="truncate rotulo-menor">{detalle}</p>}
      </div>

      <button
        type="button"
        onClick={() => setTema(tema === "oscuro" ? "claro" : "oscuro")}
        aria-label={tema === "oscuro" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line text-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
      >
        {tema === "oscuro" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="relative shrink-0" ref={caja}>
        <button
          type="button"
          onClick={() => setMenu(!menu)}
          aria-haspopup="menu"
          aria-expanded={menu}
          aria-label="Cuenta"
          className="flex h-9 items-center gap-2 rounded-md border border-line px-2.5 text-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
        >
          <UserRound size={16} />
          <span className="hidden max-w-32 truncate text-sm lg:inline">{nombre}</span>
        </button>

        {menu && (
          <div
            role="menu"
            className="absolute right-0 top-11 z-20 w-60 rounded-md border border-line bg-surface p-1 shadow-lg"
          >
            <div className="border-b border-line px-3 py-2.5">
              <p className="truncate text-sm font-medium text-ink">{nombre}</p>
              <p className="truncate font-mono text-[11px] text-faint">{correo}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => void salir()}
              className="mt-1 flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
            >
              <LogOut size={15} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
