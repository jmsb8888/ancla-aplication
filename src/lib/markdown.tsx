import type { ReactNode } from "react";

/**
 * Render de Markdown a elementos de React.
 *
 * Se escribe a mano en lugar de usar una librería con `innerHTML`: el texto
 * viene de un modelo y no debe poder inyectar HTML en la página. Cubre lo que
 * el documento de requerimientos usa de verdad: títulos, listas, tablas,
 * negritas y código.
 */

function conNegritas(texto: string, clave: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((t, i) => {
    if (t.startsWith("**") && t.endsWith("**")) {
      return (
        <strong key={`${clave}-${i}`} className="font-semibold text-ink">
          {t.slice(2, -2)}
        </strong>
      );
    }
    if (t.startsWith("`") && t.endsWith("`") && t.length > 2) {
      return (
        <code key={`${clave}-${i}`} className="rounded bg-raised px-1 font-mono text-[11px]">
          {t.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${clave}-${i}`}>{t}</span>;
  });
}

function esSeparadorTabla(linea: string): boolean {
  return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(linea) && linea.includes("-");
}

function celdas(linea: string): string[] {
  return linea
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

export function renderMarkdown(md: string): ReactNode[] {
  const lineas = md.split("\n");
  const salida: ReactNode[] = [];
  let i = 0;

  while (i < lineas.length) {
    const l = lineas[i];

    if (!l.trim()) {
      i++;
      continue;
    }

    // Títulos
    const t = l.match(/^(#{1,6})\s+(.*)$/);
    if (t) {
      const nivel = t[1].length;
      const clases = [
        "mt-6 mb-3 text-lg font-semibold text-ink",
        "mt-6 mb-3 text-base font-semibold text-ink",
        "mt-5 mb-2 text-sm font-semibold text-ink",
        "mt-4 mb-2 text-sm font-medium text-ink",
      ][Math.min(nivel, 4) - 1];
      salida.push(
        <p key={i} className={clases}>
          {conNegritas(t[2], `h${i}`)}
        </p>,
      );
      i++;
      continue;
    }

    // Tablas
    if (l.includes("|") && i + 1 < lineas.length && esSeparadorTabla(lineas[i + 1])) {
      const encabezado = celdas(l);
      const filas: string[][] = [];
      i += 2;
      while (i < lineas.length && lineas[i].includes("|")) {
        filas.push(celdas(lineas[i]));
        i++;
      }
      salida.push(
        <div key={`t${i}`} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {encabezado.map((c, j) => (
                  <th
                    key={j}
                    className="border border-line bg-raised px-2 py-1.5 text-left font-semibold text-ink"
                  >
                    {conNegritas(c, `th${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f, j) => (
                <tr key={j}>
                  {f.map((c, k) => (
                    <td key={k} className="border border-line px-2 py-1.5 align-top text-muted">
                      {conNegritas(c, `td${j}-${k}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Listas
    if (/^\s*[-*•]\s+/.test(l)) {
      const items: string[] = [];
      while (i < lineas.length && /^\s*[-*•]\s+/.test(lineas[i])) {
        items.push(lineas[i].replace(/^\s*[-*•]\s+/, ""));
        i++;
      }
      salida.push(
        <ul key={`u${i}`} className="my-2 list-disc space-y-1 pl-5 text-sm text-muted">
          {items.map((it, j) => (
            <li key={j}>{conNegritas(it, `li${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(l)) {
      const items: string[] = [];
      while (i < lineas.length && /^\s*\d+[.)]\s+/.test(lineas[i])) {
        items.push(lineas[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      salida.push(
        <ol key={`o${i}`} className="my-2 list-decimal space-y-1 pl-5 text-sm text-muted">
          {items.map((it, j) => (
            <li key={j}>{conNegritas(it, `oli${j}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Párrafo.
    //
    // La primera línea se consume siempre, y esto no es un detalle: las ramas
    // de arriba exigen un espacio tras el marcador («- item», «1. item»), pero
    // la condición de este bucle lo excluye sin exigirlo. Una línea como
    // «**Proyecto:** ACCESO» —así escribe el modelo los metadatos— no encaja
    // en ninguna rama anterior y tampoco entra aquí: `i` no avanzaba, el bucle
    // exterior giraba para siempre y la pestaña se congelaba sin un solo error
    // en consola. Arrancar el párrafo con la línea actual garantiza el avance.
    const parrafo: string[] = [lineas[i]];
    i++;
    while (i < lineas.length && lineas[i].trim() && !/^\s*([-*•]|\d+[.)]|#)/.test(lineas[i])) {
      parrafo.push(lineas[i]);
      i++;
    }
    salida.push(
      <p key={`p${i}`} className="my-2 text-sm leading-relaxed text-muted">
        {conNegritas(parrafo.join(" "), `pp${i}`)}
      </p>,
    );
  }

  return salida;
}
