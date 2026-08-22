import type { Version } from "../../lib/prompt";
import { CAPAS_MAXIMAS } from "../../lib/prompt";

const OPCIONES: { v: Version; titulo: string; nota: string; capas: number }[] = [
  { v: 1, titulo: "v1", nota: "Instrucción mínima", capas: 1 },
  { v: 2, titulo: "v2", nota: "Rol, formato y restricciones", capas: 3 },
  { v: 3, titulo: "v3", nota: "Añade ejemplo de formato", capas: 4 },
];

interface Props {
  valor: Version;
  onChange: (v: Version) => void;
}

/**
 * La progresión entre versiones es el argumento del proyecto: se ve cuántas
 * capas aporta cada una, no solo cuál está elegida.
 */
export function SelectorVersion({ valor, onChange }: Props) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-2 rotulo-menor">
        Nivel de especificidad
      </legend>
      {OPCIONES.map((o) => {
        const activa = o.v === valor;
        return (
          <label
            key={o.v}
            className={[
              "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors duration-150",
              activa
                ? "border-accent bg-accent-soft"
                : "border-line hover:border-line-strong hover:bg-raised",
            ].join(" ")}
          >
            <input
              type="radio"
              name="version"
              className="sr-only"
              checked={activa}
              onChange={() => onChange(o.v)}
            />
            <span
              className={[
                "font-mono text-sm font-semibold",
                activa ? "text-accent" : "text-muted",
              ].join(" ")}
            >
              {o.titulo}
            </span>
            <span className={activa ? "text-sm text-ink" : "text-sm text-muted"}>{o.nota}</span>
            <span
              className="ml-auto font-mono text-[10px] text-faint"
              title={`${o.capas} de ${CAPAS_MAXIMAS} capas: instrucción, rol, restricciones, ejemplo`}
            >
              {o.capas}/{CAPAS_MAXIMAS}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
