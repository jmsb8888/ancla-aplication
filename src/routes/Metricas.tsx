import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Loader2 } from "lucide-react";
import { listarProyectos, metricasGlobales } from "../lib/datos";
import { useSesion } from "../lib/sesion";
import { useTitulo } from "../lib/titulo";
import { modoDemo } from "../lib/datos";
import { EmptyState } from "../components/ui/EmptyState";

/** Horas que costaba redactar el documento a mano, según el brief de la Fase 1. */
const HORAS_MANUAL = 3;

function Tarjeta({ valor, etiqueta, nota }: { valor: string; etiqueta: string; nota?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="font-mono text-2xl font-semibold text-ink">{valor}</p>
      <p className="mt-0.5 text-xs text-muted">{etiqueta}</p>
      {nota && <p className="mt-1 font-mono text-[10px] text-faint">{nota}</p>}
    </div>
  );
}

/** Barras horizontales sobrias: el acento solo para la serie principal. */
function Barras({ datos }: { datos: { etiqueta: string; valor: number }[] }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <ul className="flex flex-col gap-2">
      {datos.map((d) => (
        <li key={d.etiqueta} className="flex items-center gap-3">
          <span className="w-24 shrink-0 font-mono text-[11px] text-muted">{d.etiqueta}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-sm bg-raised">
            <div
              className="h-full rounded-sm bg-accent transition-all duration-300"
              style={{ width: `${(d.valor / max) * 100}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-mono text-[11px] text-ink">
            {d.valor}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Metricas() {
  useTitulo("Métricas");
  const { sesion } = useSesion();
  const [proyectoId, setProyectoId] = useState("");

  const proyectos = useQuery({
    queryKey: ["proyectos"],
    queryFn: listarProyectos,
    enabled: !!sesion || modoDemo(),
  });

  const consulta = useQuery({
    queryKey: ["metricas", proyectoId],
    queryFn: () => metricasGlobales(proyectoId || undefined),
    enabled: !!sesion || modoDemo(),
  });

  if (!sesion && !modoDemo()) {
    return (
      <EmptyState
        icono={BarChart3}
        titulo="Vista previa sin sesión"
        descripcion="El tablero se calcula sobre tu histórico. Inicia sesión para verlo."
      />
    );
  }

  if (consulta.isPending) {
    return (
      <p className="flex items-center justify-center gap-2 py-20 rotulo">
        <Loader2 size={14} className="animate-spin" /> Calculando
      </p>
    );
  }

  const docs = consulta.data ?? [];

  if (!docs.length) {
    return (
      <EmptyState
        icono={BarChart3}
        titulo="Sin datos para medir"
        descripcion="El tablero se alimenta del histórico: cuántos requerimientos salen por reunión, cuántas preguntas quedan abiertas y cuánto tiempo se ahorra frente a redactar a mano."
        detalle="Se activa con el primer documento generado"
      />
    );
  }

  const suma = (campo: string) =>
    docs.reduce((a, d) => a + Number(d.metricas?.[campo] ?? 0), 0);

  const rf = suma("n_rf");
  const rnf = suma("n_rnf");
  const duracionTotal = suma("duracion_ms");
  const porVersion = [1, 2, 3].map((v) => ({
    etiqueta: `v${v}`,
    valor: docs.filter((d) => d.version_prompt === v).length,
  }));

  const horasAhorradas = Math.round(
    docs.length * HORAS_MANUAL - duracionTotal / 3_600_000,
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted">
          Sobre {docs.length} documento{docs.length === 1 ? "" : "s"} generado
          {docs.length === 1 ? "" : "s"}.
        </p>
        {(proyectos.data ?? []).length > 0 && (
          <select
            aria-label="Filtrar por proyecto"
            value={proyectoId}
            onChange={(e) => setProyectoId(e.target.value)}
            className="ml-auto h-8 rounded-md border border-line bg-surface px-2 text-xs text-ink focus:border-accent focus:outline-none"
          >
            <option value="">Todos los proyectos</option>
            {(proyectos.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tarjeta valor={String(docs.length)} etiqueta="Documentos generados" />
        <Tarjeta
          valor={docs.length ? (rf / docs.length).toFixed(1) : "0"}
          etiqueta="Requerimientos funcionales por documento"
        />
        <Tarjeta
          valor={docs.length ? (rnf / docs.length).toFixed(1) : "0"}
          etiqueta="No funcionales por documento"
        />
        <Tarjeta
          valor={`${horasAhorradas} h`}
          etiqueta="Tiempo ahorrado estimado"
          nota={`${HORAS_MANUAL} h por documento a mano`}
        />
      </div>

      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="mb-1 text-sm font-medium text-ink">
          ¿Con qué versión del prompt se trabaja?
        </h2>
        <p className="mb-4 text-xs text-muted">
          Número de documentos generados con cada nivel de especificidad.
        </p>
        <Barras datos={porVersion} />
      </section>

      <p className="mt-4 font-mono text-[10px] text-faint">
        El tiempo ahorrado es una estimación declarada: {HORAS_MANUAL} horas de redacción
        manual por documento, menos el tiempo real de generación. No es una medición
        instrumentada.
      </p>
    </div>
  );
}
