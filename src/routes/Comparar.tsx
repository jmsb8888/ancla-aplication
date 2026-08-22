import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Columns3, Loader2 } from "lucide-react";
import { listarDocumentos, listarReuniones, type DocumentoGuardado } from "../lib/datos";
import { useSesion } from "../lib/sesion";
import { modoDemo } from "../lib/datos";
import { renderMarkdown } from "../lib/markdown";
import { EmptyState } from "../components/ui/EmptyState";
import { useTitulo } from "../lib/titulo";

const VERSIONES = [1, 2, 3] as const;

const DESCRIPCION: Record<number, string> = {
  1: "Instrucción mínima",
  2: "Rol, formato y restricciones",
  3: "Añade ejemplo de formato",
};

function cifras(d: DocumentoGuardado | undefined) {
  if (!d) return null;
  const m = d.metricas ?? {};
  const secciones = (d.contenido_md.match(/^#{1,3}\s+/gm) ?? []).length;
  return {
    rf: Number(m.n_rf ?? 0),
    rnf: Number(m.n_rnf ?? 0),
    palabras: Number(m.n_palabras ?? 0),
    secciones,
  };
}

export default function Comparar() {
  useTitulo("Comparar versiones");
  const { sesion } = useSesion();
  const [reunionId, setReunionId] = useState<string>("");

  const reuniones = useQuery({
    queryKey: ["reuniones", ""],
    queryFn: () => listarReuniones(""),
    enabled: !!sesion || modoDemo(),
  });

  const docs = useQuery({
    queryKey: ["documentos", reunionId],
    queryFn: () => listarDocumentos(reunionId),
    enabled: !!reunionId,
  });

  if (!sesion && !modoDemo()) {
    return (
      <EmptyState
        icono={Columns3}
        titulo="Vista previa sin sesión"
        descripcion="La comparación enfrenta las tres versiones del prompt sobre una misma reunión. Inicia sesión para usarla."
      />
    );
  }

  const lista = reuniones.data ?? [];

  if (reuniones.isLoading) {
    return (
      <p className="flex items-center justify-center gap-2 py-20 rotulo">
        <Loader2 size={14} className="animate-spin" /> Cargando
      </p>
    );
  }

  if (!lista.length) {
    return (
      <EmptyState
        icono={Columns3}
        titulo="Nada que comparar todavía"
        descripcion="La comparación enfrenta las tres versiones del prompt sobre una misma reunión, para hacer visible cuánto cambia el resultado según cómo se pida."
        detalle="Requiere una reunión con al menos dos versiones generadas"
      />
    );
  }

  const documentos = docs.data ?? [];
  const porVersion = new Map<number, DocumentoGuardado>();
  for (const d of documentos) {
    if (!porVersion.has(d.version_prompt)) porVersion.set(d.version_prompt, d);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3">
        <label htmlFor="reunion" className="text-xs font-medium text-muted">
          Reunión
        </label>
        <select
          id="reunion"
          value={reunionId}
          onChange={(e) => setReunionId(e.target.value)}
          className="h-9 min-w-64 rounded-md border border-line bg-canvas px-2.5 text-sm text-ink focus:border-accent focus:outline-none"
        >
          <option value="">Elige una reunión…</option>
          {lista.map((r) => (
            <option key={r.id} value={r.id}>
              {r.titulo}
            </option>
          ))}
        </select>
        {reunionId && (
          <span className="font-mono text-[10px] text-faint">
            {porVersion.size} de 3 versiones generadas
          </span>
        )}
      </div>

      {!reunionId ? (
        <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted">
          Elige una reunión para ver sus versiones lado a lado.
        </p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-3 lg:overflow-hidden">
          {VERSIONES.map((v) => {
            const d = porVersion.get(v);
            const c = cifras(d);
            return (
              <section
                key={v}
                className="flex min-w-0 flex-col border-b border-line last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
              >
                <header className="shrink-0 border-b border-line px-4 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold text-accent">v{v}</span>
                    <span className="truncate text-xs text-muted">{DESCRIPCION[v]}</span>
                  </div>
                  {c ? (
                    <p className="mt-1 flex gap-3 font-mono text-[10px] text-faint">
                      <span>
                        <b className="text-ink">{c.secciones}</b> secciones
                      </span>
                      <span>
                        <b className="text-ink">{c.rf}</b> RF
                      </span>
                      <span>
                        <b className="text-ink">{c.rnf}</b> RNF
                      </span>
                      <span>
                        <b className="text-ink">{c.palabras}</b> palabras
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 font-mono text-[10px] text-faint">sin generar</p>
                  )}
                </header>

                <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
                  {d ? (
                    renderMarkdown(d.contenido_md)
                  ) : (
                    <p className="py-10 text-center text-xs text-faint">
                      Genera esta versión sobre la misma reunión para compararla.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
