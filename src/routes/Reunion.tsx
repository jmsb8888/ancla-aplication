import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  Loader2,
  Quote,
  Trash2,
} from "lucide-react";
import {
  borrarDocumento,
  listarDocumentos,
  obtenerProyecto,
  obtenerReunion,
  type DocumentoGuardado,
} from "../lib/datos";
import { porcentajeRespaldado, verificarDocumento } from "../lib/trazabilidad";
import { renderMarkdown } from "../lib/markdown";
import { exportarMarkdown, exportarPdf, exportarWord, pdfEnBase64 } from "../lib/exportar";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { useTitulo } from "../lib/titulo";

function fecha(iso: string) {
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

export default function Reunion() {
  const { id = "" } = useParams();
  const navegar = useNavigate();
  const cliente = useQueryClient();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [avisoDrive, setAvisoDrive] = useState<string | null>(null);

  const reunion = useQuery({ queryKey: ["reunion", id], queryFn: () => obtenerReunion(id) });
  const docs = useQuery({ queryKey: ["documentos", id], queryFn: () => listarDocumentos(id) });

  const datos = reunion.data as
    | { titulo?: string; proyecto?: string; proyecto_id?: string | null }
    | undefined;

  // La carpeta de Drive vive en el proyecto, no en la reunión.
  const proyecto = useQuery({
    queryKey: ["proyecto", datos?.proyecto_id],
    queryFn: () => obtenerProyecto(datos?.proyecto_id ?? ""),
    enabled: !!datos?.proyecto_id,
  });
  useTitulo(datos?.titulo ?? "Reunión", datos?.proyecto ?? null);

  const borrar = useMutation({
    mutationFn: borrarDocumento,
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["documentos", id] }),
  });

  if (reunion.isLoading || docs.isLoading) {
    return (
      <p className="flex items-center justify-center gap-2 py-20 rotulo">
        <Loader2 size={14} className="animate-spin" /> Cargando
      </p>
    );
  }

  if (reunion.isError || !reunion.data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-sm text-muted">No se encontró esta reunión.</p>
        <Button className="mt-4" onClick={() => navegar("/reuniones")}>
          Volver
        </Button>
      </div>
    );
  }

  const r = reunion.data as {
    titulo: string;
    proyecto: string;
    created_at: string;
    n_palabras: number;
    n_entidades_anonimizadas: number;
    transcripcion_anonimizada: string;
  };

  const lista = (docs.data ?? []) as DocumentoGuardado[];
  const actual = lista.find((d) => d.id === seleccionado) ?? lista[0] ?? null;

  const verificados = actual
    ? verificarDocumento(actual.contenido_md, r.transcripcion_anonimizada)
    : [];
  const respaldo = porcentajeRespaldado(verificados);
  const sinRespaldo = verificados.filter((v) => !v.respaldo.respaldado);

  const meta = actual
    ? {
        proyecto: r.proyecto || "Proyecto",
        reunion: r.titulo,
        version: actual.version_prompt,
        fecha: actual.created_at.slice(0, 10),
      }
    : null;

  async function enviarADrive() {
    if (!actual || !meta) return;
    setEnviando(true);
    setAvisoDrive(null);
    try {
      const base64 = await pdfEnBase64(actual.contenido_md, meta);
      const { data } = await supabase.auth.getSession();
      const resp = await fetch("/api/drive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
        },
        body: JSON.stringify({
          nombre: `R-01_${meta.proyecto}_${meta.fecha}_v${meta.version}.pdf`,
          mime: "application/pdf",
          contenido: base64,
          carpeta: proyecto.data?.carpeta_drive ?? "",
          metadatos: {
            proyecto: meta.proyecto,
            cliente: proyecto.data?.cliente ?? "",
            reunion: meta.reunion,
            version: meta.version,
            fecha: meta.fecha,
          },
        }),
      });
      const cuerpo = (await resp.json()) as { url?: string; error?: string };
      setAvisoDrive(
        resp.ok ? (cuerpo.url ? `Subido: ${cuerpo.url}` : "Enviado a la automatización") : (cuerpo.error ?? "Falló el envío"),
      );
    } catch (e) {
      setAvisoDrive(e instanceof Error ? e.message : "Falló el envío");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-5">
      <button
        type="button"
        onClick={() => navegar("/reuniones")}
        className="mb-4 flex items-center gap-1.5 font-mono text-[11px] text-faint hover:text-ink"
      >
        <ArrowLeft size={12} /> Reuniones
      </button>

      {/* El título y el proyecto ya están en la barra superior: aquí solo van
          los datos de la reunión y su proporción de anclaje, que es el dato
          que da nombre a la herramienta. */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <p className="font-mono text-[11px] text-faint">
          {fecha(r.created_at)} · {r.n_palabras} palabras · {r.n_entidades_anonimizadas}{" "}
          entidades anonimizadas
        </p>
        {verificados.length > 0 && (
          <p
            className="shrink-0 text-sm text-muted"
            title="Requerimientos con una frase de la transcripción que los respalde"
          >
            <b className="font-mono text-lg text-ink">
              {verificados.filter((v) => v.respaldo.respaldado).length} de {verificados.length}
            </b>{" "}
            requerimientos anclados
          </p>
        )}
      </header>

      {!lista.length ? (
        <p className="rounded-lg border border-line bg-surface py-16 text-center text-sm text-muted">
          Esta reunión todavía no tiene documentos generados.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {lista.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSeleccionado(d.id)}
                  className={[
                    "rounded border px-2.5 py-1 font-mono text-[11px] transition-colors duration-150",
                    d.id === actual?.id
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line text-muted hover:bg-raised",
                  ].join(" ")}
                >
                  v{d.version_prompt} · {new Date(d.created_at).toLocaleDateString("es-CO")}
                  {d.estado === "parcial" && " · parcial"}
                </button>
              ))}
            </div>

            {actual && (
              <article className="rounded-lg border border-line bg-surface px-6 py-5">
                {renderMarkdown(actual.contenido_md)}
              </article>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border border-line bg-surface p-4">
              <h2 className="mb-3 rotulo-menor">
                Trazabilidad
              </h2>
              <p className="text-2xl font-semibold text-ink">
                {respaldo}
                <span className="text-base text-muted">%</span>
              </p>
              <p className="text-xs text-muted">
                de {verificados.length} requerimientos tienen respaldo en la transcripción
              </p>

              {sinRespaldo.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                  {sinRespaldo.slice(0, 6).map((v) => (
                    <li key={v.codigo} className="flex items-start gap-2">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0 text-warn" />
                      <span className="text-xs text-muted">
                        <b className="font-mono text-[11px] text-ink">{v.codigo}</b> sin frase
                        que lo respalde
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {verificados.some((v) => v.respaldo.respaldado) && (
                <details className="mt-3 border-t border-line pt-3">
                  <summary className="cursor-pointer rotulo-menor">
                    Ver citas
                  </summary>
                  <ul className="mt-2 flex flex-col gap-2">
                    {verificados
                      .filter((v) => v.respaldo.respaldado)
                      .slice(0, 8)
                      .map((v) => (
                        <li key={v.codigo} className="text-xs">
                          <p className="flex items-center gap-1.5 text-muted">
                            <CheckCircle2 size={11} className="text-ok" />
                            <b className="font-mono text-[11px] text-ink">{v.codigo}</b>
                            <span className="font-mono text-[10px] text-faint">
                              {Math.round(v.respaldo.puntaje * 100)}%
                            </span>
                          </p>
                          <p className="mt-0.5 flex gap-1.5 pl-4 text-faint">
                            <Quote size={10} className="mt-0.5 shrink-0" />
                            <span className="italic">{v.respaldo.cita?.slice(0, 120)}</span>
                          </p>
                        </li>
                      ))}
                  </ul>
                </details>
              )}
            </section>

            {actual && meta && (
              <section className="rounded-lg border border-line bg-surface p-4">
                <h2 className="mb-3 rotulo-menor">
                  Exportar
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="h-8 px-3 text-xs"
                    onClick={() => void exportarPdf(actual.contenido_md, meta)}
                  >
                    PDF
                  </Button>
                  <Button
                    className="h-8 px-3 text-xs"
                    onClick={() => exportarWord(actual.contenido_md, meta)}
                  >
                    Word
                  </Button>
                  <Button
                    className="h-8 px-3 text-xs"
                    onClick={() => exportarMarkdown(actual.contenido_md, meta)}
                  >
                    Markdown
                  </Button>
                </div>
                <Button
                  variante="secundario"
                  className="mt-2 h-8 w-full px-3 text-xs"
                  disabled={enviando}
                  onClick={() => void enviarADrive()}
                  title={
                    proyecto.data?.carpeta_drive
                      ? `Archiva en la carpeta del proyecto ${proyecto.data.nombre}`
                      : "El proyecto no tiene carpeta configurada: irá a la carpeta por defecto"
                  }
                >
                  {enviando ? <Loader2 size={13} className="animate-spin" /> : <CloudUpload size={13} />}
                  Enviar a Drive
                </Button>
                {avisoDrive && (
                  <p className="mt-2 break-words font-mono text-[10px] text-faint">{avisoDrive}</p>
                )}
              </section>
            )}

            {actual && (
              <section className="rounded-lg border border-line bg-surface p-4">
                <h2 className="mb-2 rotulo-menor">
                  Este documento
                </h2>
                <dl className="flex flex-col gap-1 text-xs">
                  {Object.entries(actual.metricas ?? {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-muted">{k.replace(/_/g, " ")}</dt>
                      <dd className="font-mono text-ink">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
                <details className="mt-3 border-t border-line pt-2">
                  <summary className="cursor-pointer rotulo-menor">
                    Prompt enviado
                  </summary>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-muted">
                    {actual.prompt_enviado}
                  </pre>
                </details>
                <Button
                  variante="peligro"
                  className="mt-3 h-8 w-full px-3 text-xs"
                  onClick={() => {
                    if (confirm("¿Borrar este documento? No se puede deshacer.")) {
                      borrar.mutate(actual.id);
                      setSeleccionado(null);
                    }
                  }}
                >
                  <Trash2 size={13} />
                  Borrar documento
                </Button>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
