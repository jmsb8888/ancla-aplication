import { Check, Loader2, ShieldCheck, Sparkles, Undo2, X } from "lucide-react";
import { NOMBRES_TIPO, type Sustitucion } from "../../lib/anonimizar";

interface Props {
  sustituciones: Sustitucion[];
  onAlternar: (indice: number) => void;
  onTodas: (aceptadas: boolean) => void;
  onSegundaPasada: () => void;
  buscando: boolean;
  avisoSegundaPasada: string | null;
}

/**
 * Panel de revisión. Nada sale hacia el modelo sin que estas sustituciones
 * pasen por aquí: el usuario manda sobre qué se oculta y qué no.
 */
export function PanelAnonimizador({
  sustituciones,
  onAlternar,
  onTodas,
  onSegundaPasada,
  buscando,
  avisoSegundaPasada,
}: Props) {
  const aceptadas = sustituciones.filter((s) => s.aceptada).length;
  const rechazadas = sustituciones.length - aceptadas;

  const botonIa = (
    <button
      type="button"
      onClick={onSegundaPasada}
      disabled={buscando}
      title="Busca nombres de persona y empresa que las reglas no detectan"
      className="flex items-center gap-1.5 rounded border border-line px-2 py-0.5 font-mono text-[10px] text-muted hover:bg-raised hover:text-ink disabled:opacity-50"
    >
      {buscando ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
      {buscando ? "buscando" : "buscar más con IA"}
    </button>
  );

  if (sustituciones.length === 0) {
    return (
      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <p className="flex items-center gap-2 text-xs text-muted">
            <ShieldCheck size={14} className="text-ok" />
            Las reglas no encontraron nada identificable.
          </p>
          <div className="ml-auto">{botonIa}</div>
        </div>
        {avisoSegundaPasada && (
          <p className="mt-2 font-mono text-[10px] text-faint">{avisoSegundaPasada}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex max-h-72 flex-col border-t border-line">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
        <span className="rotulo-menor">
          Entidades detectadas
        </span>
        <span className="font-mono text-[10px] text-muted">
          <b className="text-accent">{aceptadas}</b> se ocultan
          {rechazadas > 0 && <> · {rechazadas} se dejan</>}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {botonIa}
          <button
            type="button"
            onClick={() => onTodas(true)}
            className="rounded border border-line px-2 py-0.5 font-mono text-[10px] text-muted hover:bg-raised hover:text-ink"
          >
            todas
          </button>
          <button
            type="button"
            onClick={() => onTodas(false)}
            className="rounded border border-line px-2 py-0.5 font-mono text-[10px] text-muted hover:bg-raised hover:text-ink"
          >
            ninguna
          </button>
        </div>
      </div>

      {avisoSegundaPasada && (
        <p className="border-b border-line px-4 py-1.5 font-mono text-[10px] text-faint">
          {avisoSegundaPasada}
        </p>
      )}

      <ul className="min-h-0 flex-1 overflow-auto">
        {sustituciones.map((s, i) => (
          <li
            key={s.original}
            className="flex items-center gap-3 border-b border-line/60 px-4 py-2 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p
                className={[
                  "truncate text-sm",
                  s.aceptada ? "text-ink" : "text-faint line-through",
                ].join(" ")}
              >
                {s.original}
              </p>
              <p className="font-mono text-[10px] text-faint">
                {NOMBRES_TIPO[s.tipo]}
                {s.ocurrencias > 1 && ` · ${s.ocurrencias} apariciones`}
                {s.origen === "modelo" && " · detectada por el modelo"}
              </p>
            </div>

            <code
              className={[
                "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]",
                s.aceptada ? "bg-accent-soft text-accent" : "text-faint",
              ].join(" ")}
            >
              {s.reemplazo}
            </code>

            <button
              type="button"
              onClick={() => onAlternar(i)}
              aria-label={s.aceptada ? `No ocultar ${s.original}` : `Ocultar ${s.original}`}
              title={s.aceptada ? "Dejar el texto original" : "Ocultar"}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line text-muted hover:bg-raised hover:text-ink"
            >
              {s.aceptada ? <X size={12} /> : <Undo2 size={12} />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarcaAnonimizada({ children }: { children: string }) {
  return (
    <mark className="rounded bg-accent-soft px-0.5 font-mono text-[11px] text-accent">
      {children}
    </mark>
  );
}

export function IconoListo() {
  return <Check size={13} className="text-ok" />;
}
