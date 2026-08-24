import { AlertTriangle, Check, FileText, Loader2, RotateCcw } from "lucide-react";
import { renderMarkdown } from "../../lib/markdown";
import { exportarMarkdown, exportarPdf, exportarWord, type Meta } from "../../lib/exportar";
import type { Parte, ProgresoGeneracion } from "../../lib/generar";
import { Button } from "../ui/Button";

interface Props {
  /** Requerimientos con respaldo en la transcripción, sobre el total. */
  anclaje: { anclados: number; total: number } | null;
  progreso: ProgresoGeneracion | null;
  corriendo: boolean;
  onReintentar: (indice: number) => void;
  meta: Meta;
}

const NOMBRES_CORTOS = [
  "Encabezado y alcance",
  "Glosario",
  "Requerimientos funcionales",
  "No funcionales y supuestos",
  "Conflictos y preguntas",
  "Trazabilidad y cierre",
];

function Paso({ parte, onReintentar }: { parte: Parte; onReintentar: () => void }) {
  const icono = {
    pendiente: <span className="font-mono text-[10px] text-faint">{parte.indice + 1}</span>,
    corriendo: <Loader2 size={12} className="animate-spin text-accent" />,
    lista: <Check size={12} className="text-ok" />,
    error: <AlertTriangle size={12} className="text-danger" />,
  }[parte.estado];

  return (
    <li className="flex items-center gap-2.5 px-4 py-1.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line">
        {icono}
      </span>
      <span
        className={[
          "truncate text-xs",
          parte.estado === "lista"
            ? "text-muted"
            : parte.estado === "corriendo"
              ? "text-ink"
              : parte.estado === "error"
                ? "text-danger"
                : "text-faint",
        ].join(" ")}
      >
        {NOMBRES_CORTOS[parte.indice]}
      </span>
      {parte.estado === "error" && (
        <button
          type="button"
          onClick={onReintentar}
          className="ml-auto flex items-center gap-1 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted hover:bg-raised hover:text-ink"
        >
          <RotateCcw size={10} />
          reintentar
        </button>
      )}
    </li>
  );
}

export function PanelDocumento({ anclaje, progreso, corriendo, onReintentar, meta }: Props) {
  if (!progreso) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <FileText size={20} className="text-faint" strokeWidth={1.5} />
        <p className="max-w-xs text-sm text-muted">
          El documento aparecerá aquí en cuanto termine la generación.
        </p>
      </div>
    );
  }

  const listas = progreso.partes.filter((p) => p.estado === "lista").length;
  const conError = progreso.partes.filter((p) => p.estado === "error").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-line py-1">
        <div className="flex flex-wrap items-center gap-2 px-4 py-1">
          <span className="mr-auto rotulo-menor">
            {/* El total sale de las partes reales, no de un 6 fijo: en modo de
                una llamada solo hay una, y decir «1 de 6 partes» hacía parecer
                que faltaban cinco sobre un documento ya terminado. */}
            {corriendo
              ? `Parte ${listas + 1} de ${progreso.partes.length}`
              : `${listas} de ${progreso.partes.length} ${progreso.partes.length === 1 ? "parte" : "partes"}`}
          </span>
          {anclaje && anclaje.total > 0 && (
            <span
              title="Requerimientos con una frase de la transcripción que los respalde"
              className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted"
            >
              <b className={anclaje.anclados === anclaje.total ? "text-ok" : "text-warn"}>
                {anclaje.anclados}
              </b>{" "}
              de {anclaje.total} anclados
            </span>
          )}
          {progreso.simulado && (
            <span className="rounded border border-warn px-1.5 py-0.5 font-mono text-[9px] uppercase text-warn">
              simulación
            </span>
          )}
          {progreso.truncado && (
            <span
              title="El modelo agotó su presupuesto de tokens: el documento está cortado. Vuelve a generar o usa el modo troceado."
              className="rounded border border-danger px-1.5 py-0.5 font-mono text-[9px] uppercase text-danger"
            >
              cortado
            </span>
          )}
        </div>
        <ul aria-live="polite">
          {progreso.partes.map((p) => (
            <Paso key={p.indice} parte={p} onReintentar={() => onReintentar(p.indice)} />
          ))}
        </ul>
      </div>

      {conError > 0 && (
        <p className="flex items-start gap-2 border-b border-line bg-raised px-4 py-2 text-xs text-danger">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {progreso.partes.find((p) => p.estado === "error")?.error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
        {progreso.documento ? (
          renderMarkdown(progreso.documento)
        ) : (
          <p className="py-8 text-center text-sm text-faint">Esperando la primera parte…</p>
        )}
      </div>

      {progreso.terminado && progreso.documento && (
        <div className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-2.5">
          <Button
            variante="secundario"
            className="h-8 px-3 text-xs"
            onClick={() => void exportarPdf(progreso.documento, meta)}
          >
            Descargar PDF
          </Button>
          <Button
            variante="secundario"
            className="h-8 px-3 text-xs"
            onClick={() => exportarWord(progreso.documento, meta)}
          >
            Word
          </Button>
          <Button
            variante="secundario"
            className="h-8 px-3 text-xs"
            onClick={() => exportarMarkdown(progreso.documento, meta)}
          >
            Markdown
          </Button>
          <span className="ml-auto font-mono text-[10px] text-faint">
            {progreso.documento.trim().split(/\s+/).length} palabras
          </span>
        </div>
      )}
    </div>
  );
}
