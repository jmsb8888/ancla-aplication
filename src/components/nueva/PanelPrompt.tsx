import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { PromptArmado } from "../../lib/prompt";
import { CAPAS_MAXIMAS } from "../../lib/prompt";

interface Props {
  prompt: PromptArmado;
}

/**
 * El prompt en vivo. Es la pieza distintiva de la herramienta: se ve exactamente
 * lo que se va a enviar, y qué bloque aporta la versión elegida respecto de la
 * anterior.
 */
export function PanelPrompt({ prompt }: Props) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(prompt.texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="rotulo-menor">
          Prompt que se enviará
        </span>
        <button
          type="button"
          onClick={() => void copiar()}
          className="flex items-center gap-1.5 rounded border border-line px-2 py-1 font-mono text-[10px] text-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
        >
          {copiado ? <Check size={11} /> : <Copy size={11} />}
          {copiado ? "copiado" : "copiar"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-3">
          {prompt.bloques.map((b, i) => (
            <div
              key={i}
              className={[
                "rounded-r border-l-2 py-1 pl-3 transition-colors duration-150",
                b.nuevo ? "border-accent bg-accent-soft/40" : "border-line",
              ].join(" ")}
            >
              <p
                className={[
                  "mb-1 font-mono text-[10px] uppercase tracking-wider",
                  b.nuevo ? "text-accent" : "text-faint",
                ].join(" ")}
              >
                {b.etiqueta}
                {b.nuevo && " · nuevo en esta versión"}
              </p>
              <pre className="whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-muted">
                {b.tipo === "transcripcion" && b.texto.length > 600
                  ? b.texto.slice(0, 600) + "\n[…]"
                  : b.texto}
              </pre>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-line px-4 py-2 font-mono text-[10px] text-faint">
        <span>
          Transcripción <b className="text-muted">{prompt.palabrasTranscripcion}</b> palabras
        </span>
        <span>
          Prompt <b className="text-muted">{prompt.caracteres.toLocaleString("es")}</b> caracteres
        </span>
        <span className="ml-auto">
          Capas{" "}
          <b className="text-accent">
            {prompt.capas}/{CAPAS_MAXIMAS}
          </b>
        </span>
      </div>
    </div>
  );
}
