import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, FolderOpen, Loader2, Search } from "lucide-react";
import { listarProyectos, listarReuniones } from "../lib/datos";
import { useSesion } from "../lib/sesion";
import { modoDemo } from "../lib/datos";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { useTitulo } from "../lib/titulo";

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Reuniones() {
  useTitulo("Reuniones");
  const navegar = useNavigate();
  const { sesion } = useSesion();
  const [busqueda, setBusqueda] = useState("");
  const [proyectoId, setProyectoId] = useState("");

  const proyectos = useQuery({
    queryKey: ["proyectos"],
    queryFn: listarProyectos,
    enabled: !!sesion || modoDemo(),
  });

  const consulta = useQuery({
    queryKey: ["reuniones", busqueda, proyectoId],
    queryFn: () => listarReuniones(busqueda, proyectoId || undefined),
    enabled: !!sesion || modoDemo(),
  });

  if (!sesion && !modoDemo()) {
    return (
      <EmptyState
        icono={FolderOpen}
        titulo="Vista previa sin sesión"
        descripcion="El historial vive en tu cuenta. Inicia sesión para ver y guardar tus reuniones."
        detalle="Esta pantalla solo aparece así en desarrollo"
      />
    );
  }

  // `isPending`, no `isLoading`.
  //
  // React Query apaga `isLoading` entre un reintento y el siguiente, así que
  // con el token vencido la pantalla caía al estado vacío durante los siete
  // segundos de reintentos: decía «Sin reuniones registradas» teniendo dos
  // guardadas. `isPending` sigue en pie hasta que hay dato o error.
  if (consulta.isPending) {
    return (
      <p className="flex items-center justify-center gap-2 py-20 rotulo">
        <Loader2 size={14} className="animate-spin" />
        Cargando reuniones
      </p>
    );
  }

  if (consulta.isError) {
    return (
      <EmptyState
        icono={AlertCircle}
        titulo="No se pudieron cargar las reuniones"
        descripcion={
          consulta.error instanceof Error ? consulta.error.message : "Error desconocido"
        }
        accion={<Button onClick={() => void consulta.refetch()}>Reintentar</Button>}
      />
    );
  }

  const reuniones = consulta.data ?? [];

  if (!reuniones.length && !busqueda) {
    return (
      <EmptyState
        icono={FolderOpen}
        titulo="Sin reuniones registradas"
        descripcion="Cada reunión guarda su transcripción anonimizada y los documentos de requerimientos que se generen a partir de ella."
        detalle="Aquí aparecerán: fecha · proyecto · versión de prompt · número de requerimientos"
        accion={
          <Button variante="primario" onClick={() => navegar("/nueva")}>
            Nueva reunión
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título o proyecto"
            aria-label="Buscar reuniones"
            className="h-9 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />
        </div>
        {(proyectos.data ?? []).length > 0 && (
          <select
            aria-label="Filtrar por proyecto"
            value={proyectoId}
            onChange={(e) => setProyectoId(e.target.value)}
            className="h-9 shrink-0 rounded-md border border-line bg-surface px-2.5 text-sm text-ink focus:border-accent focus:outline-none"
          >
            <option value="">Todos los proyectos</option>
            {(proyectos.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}
        <Button variante="primario" onClick={() => navegar("/nueva")} className="shrink-0">
          Nueva reunión
        </Button>
      </div>

      {!reuniones.length ? (
        <p className="py-16 text-center text-sm text-muted">
          Ninguna reunión coincide con «{busqueda}».
        </p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-line bg-surface">
          {reuniones.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => navegar(`/reuniones/${r.id}`)}
                className="flex w-full items-center gap-4 border-b border-line px-4 py-3 text-left transition-colors duration-150 last:border-0 hover:bg-raised"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{r.titulo}</p>
                  <p className="truncate font-mono text-[11px] text-faint">
                    {r.proyecto || "sin proyecto"} · {r.n_palabras} palabras
                  </p>
                </div>
                <span className="shrink-0 rounded border border-line px-2 py-0.5 font-mono text-[10px] text-muted">
                  {r.documentos?.[0]?.count ?? 0} doc
                  {(r.documentos?.[0]?.count ?? 0) === 1 ? "" : "s"}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-faint">
                  {fecha(r.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
