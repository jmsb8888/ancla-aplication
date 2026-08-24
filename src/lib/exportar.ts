/**
 * Exportación del documento: Markdown, Word y PDF.
 *
 * El PDF se arma con pdfmake a partir del Markdown, no con una captura de
 * pantalla: el texto queda seleccionable y las tablas son tablas de verdad.
 */
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";

// Los tipos publicados de pdfmake no describen `vfs` ni el callback de
// getBase64; se acota el hueco aquí en vez de esparcir `any` por el archivo.
interface PdfMakeRuntime {
  /** Forma de registrar fuentes en 0.2. En 0.3 se ignora. */
  vfs: Record<string, string>;
  /** Forma de registrarlas en 0.3. No existe en 0.2. */
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
  fonts: Record<string, Record<string, string>>;
  createPdf: (def: TDocumentDefinitions) => {
    // En pdfmake 0.3 estos métodos devuelven promesas; en 0.2 usaban callback.
    download: (nombre: string) => Promise<void> | void;
    getBase64: () => Promise<string>;
  };
}

/**
 * pdfmake con sus fuentes pesa unos 2 MB. Se carga solo cuando alguien exporta
 * de verdad, no en cada visita a la aplicación.
 */
let cargando: Promise<PdfMakeRuntime> | null = null;

function cargarPdfMake(): Promise<PdfMakeRuntime> {
  if (!cargando) {
    cargando = (async () => {
      const [modulo, fuentesModulo] = await Promise.all([
        import("pdfmake/build/pdfmake"),
        import("pdfmake/build/vfs_fonts"),
      ]);
      const pdf = (modulo.default ?? modulo) as unknown as PdfMakeRuntime;

      // pdfmake 0.2 exporta { vfs }; 0.3 exporta el objeto de fuentes directo.
      const f = (fuentesModulo as { default?: unknown }).default ?? fuentesModulo;
      const fuentes = f as Record<string, string> & { vfs?: Record<string, string> };
      const tabla = fuentes.vfs ?? fuentes;

      // En 0.3 hay que registrarlas con `addVirtualFileSystem`: asignar `.vfs`
      // es la forma de 0.2 y en 0.3 no hace nada, así que la exportación moría
      // con «File 'Roboto-Regular.ttf' not found in virtual file system».
      if (typeof pdf.addVirtualFileSystem === "function") {
        pdf.addVirtualFileSystem(tabla);
      } else {
        pdf.vfs = tabla;
      }

      pdf.fonts = {
        Roboto: {
          normal: "Roboto-Regular.ttf",
          bold: "Roboto-Medium.ttf",
          italics: "Roboto-Italic.ttf",
          bolditalics: "Roboto-MediumItalic.ttf",
        },
      };
      return pdf;
    })();
  }
  return cargando;
}

export interface Meta {
  proyecto: string;
  reunion: string;
  version: number;
  fecha: string;
}

export function nombreArchivo(meta: Meta, extension: string): string {
  const limpio = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
  return `R-01_${limpio(meta.proyecto)}_${meta.fecha}_v${meta.version}.${extension}`;
}

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ----------------------------------------------------------------- Markdown
export function exportarMarkdown(md: string, meta: Meta) {
  descargar(new Blob([md], { type: "text/markdown;charset=utf-8" }), nombreArchivo(meta, "md"));
}

// --------------------------------------------------------------------- Word
function mdAHtml(md: string): string {
  const escapar = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const enLinea = (s: string) =>
    escapar(s)
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\*([^*\n]+)\*/g, "<i>$1</i>");

  const salida: string[] = [];
  const lineas = md.split("\n");
  let i = 0;

  while (i < lineas.length) {
    const l = lineas[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    // Los `---` del Markdown son una separación, no texto que imprimir.
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) {
      salida.push("<hr />");
      i++;
      continue;
    }
    const t = l.match(/^(#{1,6})\s+(.*)$/);
    if (t) {
      const n = Math.min(t[1].length + 1, 6);
      salida.push(`<h${n}>${enLinea(t[2])}</h${n}>`);
      i++;
      continue;
    }
    if (l.includes("|") && /^[\s|:-]+$/.test(lineas[i + 1] ?? "")) {
      const fila = (x: string) =>
        x.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
      const cab = fila(l);
      i += 2;
      const cuerpo: string[][] = [];
      while (i < lineas.length && lineas[i].includes("|")) {
        cuerpo.push(fila(lineas[i]));
        i++;
      }
      salida.push(
        '<table border="1" cellspacing="0" cellpadding="4"><tr>' +
          cab.map((c) => `<th>${enLinea(c)}</th>`).join("") +
          "</tr>" +
          cuerpo
            .map((f) => "<tr>" + f.map((c) => `<td>${enLinea(c)}</td>`).join("") + "</tr>")
            .join("") +
          "</table>",
      );
      continue;
    }
    if (/^\s*[-*]\s+/.test(l)) {
      const items: string[] = [];
      while (i < lineas.length && /^\s*[-*]\s+/.test(lineas[i])) {
        items.push(`<li>${enLinea(lineas[i].replace(/^\s*[-*]\s+/, ""))}</li>`);
        i++;
      }
      salida.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    salida.push(`<p>${enLinea(l)}</p>`);
    i++;
  }
  return salida.join("\n");
}

export function exportarWord(md: string, meta: Meta) {
  const html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>' +
    meta.proyecto +
    "</title></head><body style=\"font-family:Calibri,sans-serif\">" +
    mdAHtml(md) +
    "</body></html>";
  descargar(
    new Blob(["﻿", html], { type: "application/msword" }),
    nombreArchivo(meta, "doc"),
  );
}

// ---------------------------------------------------------------------- PDF
function mdAPdf(md: string): Content[] {
  const contenido: Content[] = [];
  const lineas = md.split("\n");
  let i = 0;

  /**
   * Devuelve el valor del campo `text` de pdfmake: una cadena si no hay
   * negritas, o los trozos con su formato si las hay.
   *
   * Antes se borraban los `**` y se perdía la negrita: en un documento donde
   * casi todos los rótulos van en negrita («**Proyecto:**», «**RF-01**»), el
   * PDF salía plano y costaba distinguir el rótulo del contenido.
   */
  const rico = (
    s: string,
  ): string | (string | { text: string; bold?: true; italics?: true })[] => {
    const limpio = s.replace(/`/g, "");
    if (!limpio.includes("*")) return limpio;
    return limpio
      .split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g)
      .map((trozo) => {
        if (trozo.startsWith("**") && trozo.endsWith("**"))
          return { text: trozo.slice(2, -2), bold: true as const };
        // La cursiva se comprueba después: «**x**» también empieza por «*».
        if (trozo.startsWith("*") && trozo.endsWith("*") && trozo.length > 2)
          return { text: trozo.slice(1, -1), italics: true as const };
        return trozo;
      })
      .filter((t) => (typeof t === "string" ? t.length > 0 : true));
  };

  /** Línea horizontal de separación, para los `---` del Markdown. */
  const REGLA = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;

  /**
   * Ancho de la caja de texto en puntos: LETTER (612) menos los márgenes
   * laterales de `definicion` (56 y 56), con un margen de holgura para los
   * filetes de la tabla.
   */
  const ANCHO_UTIL = 496;

  while (i < lineas.length) {
    const l = lineas[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    // La regla horizontal va antes que nada: si no, cae en el párrafo y el
    // documento se llena de «---» impresos como texto.
    if (REGLA.test(l)) {
      contenido.push({
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 496, y2: 0, lineWidth: 0.5, lineColor: "#d4d4d8" }],
        margin: [0, 6, 0, 10],
      });
      i++;
      continue;
    }

    const t = l.match(/^(#{1,6})\s+(.*)$/);
    if (t) {
      contenido.push({
        text: rico(t[2]),
        style: t[1].length <= 2 ? "titulo" : "subtitulo",
      });
      i++;
      continue;
    }
    if (l.includes("|") && /^[\s|:-]+$/.test(lineas[i + 1] ?? "")) {
      const fila = (x: string) =>
        x.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
      const cab = fila(l);
      i += 2;
      const cuerpo: string[][] = [];
      while (i < lineas.length && lineas[i].includes("|")) {
        const f = fila(lineas[i]);
        while (f.length < cab.length) f.push("");
        cuerpo.push(f.slice(0, cab.length));
        i++;
      }
      // Las columnas se reparten según cuánto texto llevan. Con todas a "*" la
      // de descripción quedaba espachurrada en cuatro palabras por línea
      // mientras «Prioridad», de una sola palabra, ocupaba lo mismo. La raíz
      // cuadrada amortigua: sin ella, una descripción larga se comería la
      // tabla entera.
      //
      // Los anchos van en puntos, no en «2*»: pdfmake solo entiende 'auto',
      // '*' o un número, y con la forma estrellada falla con «unsupported
      // number».
      const pesos = cab.map((_, j) =>
        Math.sqrt(Math.max(cab[j].length, ...cuerpo.map((f) => (f[j] ?? "").length), 1)),
      );
      const suma = pesos.reduce((a, b) => a + b, 0);
      const proporciones = pesos.map((p) => Math.round((p / suma) * ANCHO_UTIL));
      // El redondeo se absorbe en la última columna para no pasarse del ancho.
      proporciones[proporciones.length - 1] +=
        ANCHO_UTIL - proporciones.reduce((a, b) => a + b, 0);

      contenido.push({
        table: {
          headerRows: 1,
          widths: proporciones,
          body: [
            cab.map((c) => ({ text: rico(c), bold: true, fontSize: 8 })),
            ...cuerpo.map((f) => f.map((c) => ({ text: rico(c), fontSize: 8 }))),
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 4, 0, 8],
      });
      continue;
    }
    if (/^\s*[-*]\s+/.test(l)) {
      const items: Content[] = [];
      while (i < lineas.length && /^\s*[-*]\s+/.test(lineas[i])) {
        items.push({ text: rico(lineas[i].replace(/^\s*[-*]\s+/, "")) });
        i++;
      }
      contenido.push({ ul: items, margin: [0, 2, 0, 6] });
      continue;
    }
    contenido.push({ text: rico(l), margin: [0, 0, 0, 4] });
    i++;
  }
  return contenido;
}

function definicion(md: string, meta: Meta): TDocumentDefinitions {
  return {
    info: {
      title: `${meta.proyecto} — Requerimientos`,
      author: "Ancla · R-01 v2",
      creator: "Ancla · R-01 v2",
    },
    pageSize: "LETTER",
    pageMargins: [56, 64, 56, 56],
    footer: (actual, total) => ({
      columns: [
        { text: `${meta.proyecto} · ${meta.reunion} · Ancla R-01 v2`, fontSize: 7, color: "#888" },
        { text: `${actual} / ${total}`, alignment: "right", fontSize: 7, color: "#888" },
      ],
      margin: [56, 12, 56, 0],
    }),
    content: [
      { text: "Documento de requerimientos", style: "portada" },
      { text: meta.proyecto, style: "titulo" },
      {
        text: `Reunión: ${meta.reunion}  ·  ${meta.fecha}  ·  prompt v${meta.version}`,
        style: "meta",
      },
      { text: "", margin: [0, 0, 0, 10] },
      ...mdAPdf(md),
    ],
    styles: {
      portada: { fontSize: 9, color: "#666", characterSpacing: 1, margin: [0, 0, 0, 4] },
      titulo: { fontSize: 15, bold: true, margin: [0, 6, 0, 4] },
      subtitulo: { fontSize: 11, bold: true, margin: [0, 8, 0, 3] },
      meta: { fontSize: 8, color: "#666" },
    },
    defaultStyle: { fontSize: 9.5, lineHeight: 1.25 },
  };
}

export async function exportarPdf(md: string, meta: Meta) {
  const pdf = await cargarPdfMake();
  await pdf.createPdf(definicion(md, meta)).download(nombreArchivo(meta, "pdf"));
}

/** El mismo PDF pero en base64, que es lo que espera la automatización a Drive. */
export async function pdfEnBase64(md: string, meta: Meta): Promise<string> {
  const pdf = await cargarPdfMake();
  return pdf.createPdf(definicion(md, meta)).getBase64();
}
