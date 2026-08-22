import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  /** Qué aparecerá aquí cuando haya datos: se explica, no se deja en blanco. */
  detalle?: string;
  accion?: ReactNode;
}

export function EmptyState({ icono: Icono, titulo, descripcion, detalle, accion }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-line bg-raised">
        <Icono size={20} className="text-faint" strokeWidth={1.5} />
      </div>
      <h2 className="text-base font-semibold text-ink">{titulo}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{descripcion}</p>
      {detalle && (
        <p className="mt-4 max-w-md font-mono text-xs leading-relaxed text-faint">{detalle}</p>
      )}
      {accion && <div className="mt-7">{accion}</div>}
    </div>
  );
}
