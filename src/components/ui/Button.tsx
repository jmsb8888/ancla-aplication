import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  children: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium " +
  "rounded-md border transition-colors duration-150 disabled:opacity-45 " +
  "disabled:cursor-not-allowed whitespace-nowrap";

const estilos: Record<Variante, string> = {
  primario:
    "bg-accent text-accent-ink border-accent hover:bg-accent-hover hover:border-accent-hover",
  secundario:
    "bg-surface text-ink border-line hover:border-line-strong hover:bg-raised",
  fantasma:
    "bg-transparent text-muted border-transparent hover:text-ink hover:bg-raised",
  peligro:
    "bg-transparent text-danger border-line hover:border-danger hover:bg-raised",
};

export function Button({ variante = "secundario", className = "", children, ...rest }: Props) {
  return (
    <button className={`${base} ${estilos[variante]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
