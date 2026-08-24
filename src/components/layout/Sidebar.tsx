import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Columns3,
  FolderGit2,
  FolderOpen,
  PlusCircle,
} from "lucide-react";

const enlaces = [
  { a: "/proyectos", icono: FolderGit2, texto: "Proyectos" },
  { a: "/reuniones", icono: FolderOpen, texto: "Reuniones" },
  { a: "/nueva", icono: PlusCircle, texto: "Nueva" },
  { a: "/comparar", icono: Columns3, texto: "Comparar" },
  { a: "/metricas", icono: BarChart3, texto: "Métricas" },
];

export function Sidebar() {
  return (
    <nav
      aria-label="Navegación principal"
      className="flex h-full w-52 shrink-0 flex-col border-r border-line bg-surface"
    >
      <div className="flex h-14 items-center border-b border-line px-4">
        <p className="font-display text-xl font-bold tracking-tight text-ink">Ancla</p>
      </div>

      <ul className="flex flex-col gap-0.5 p-2">
        {enlaces.map(({ a, icono: Icono, texto }) => (
          <li key={a}>
            <NavLink
              to={a}
              className={({ isActive }) =>
                [
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-150",
                  isActive
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:bg-raised hover:text-ink",
                ].join(" ")
              }
            >
              <Icono size={16} strokeWidth={1.75} />
              {texto}
            </NavLink>
          </li>
        ))}
      </ul>


    </nav>
  );
}
