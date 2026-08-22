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
  vfs: Record<string, string>;
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
      pdf.vfs = fuentes.vfs ?? fuentes;
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
    escapar(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");

  const salida: string[] = [];
  const lineas = md.split("\n");
  let i = 0;

  while (i < lineas.length) {
    const l = lineas[i];
    if (!l.trim()) {
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

  const limpiar = (s: string) => s.replace(/\*\*/g, "").replace(/`/g, "");

  while (i < lineas.length) {
    const l = lineas[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    const t = l.match(/^(#{1,6})\s+(.*)$/);
    if (t) {
      contenido.push({
        text: limpiar(t[2]),
        style: t[1].length <= 2 ? "titulo" : "subtitulo",
      });
      i++;
      continue;
    }
    if (l.includes("|") && /^[\s|:-]+$/.test(lineas[i + 1] ?? "")) {
      const fila = (x: string) =>
        x.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => limpiar(c.trim()));
      const cab = fila(l);
      i += 2;
      const cuerpo: string[][] = [];
      while (i < lineas.length && lineas[i].includes("|")) {
        const f = fila(lineas[i]);
        while (f.length < cab.length) f.push("");
        cuerpo.push(f.slice(0, cab.length));
        i++;
      }
      contenido.push({
        table: {
          headerRows: 1,
          widths: cab.map(() => "*"),
          body: [cab.map((c) => ({ text: c, bold: true, fontSize: 8 })), ...cuerpo.map((f) => f.map((c) => ({ text: c, fontSize: 8 })))],
        },
        layout: "lightHorizontalLines",
        margin: [0, 4, 0, 8],
      });
      continue;
    }
    if (/^\s*[-*]\s+/.test(l)) {
      const items: string[] = [];
      while (i < lineas.length && /^\s*[-*]\s+/.test(lineas[i])) {
        items.push(limpiar(lineas[i].replace(/^\s*[-*]\s+/, "")));
        i++;
      }
      contenido.push({ ul: items, margin: [0, 2, 0, 6] });
      continue;
    }
    contenido.push({ text: limpiar(l), margin: [0, 0, 0, 4] });
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
