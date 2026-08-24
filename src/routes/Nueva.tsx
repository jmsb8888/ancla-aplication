import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Info, Pencil, Play, ShieldCheck } from "lucide-react";
import {
  construir,
  faltaAlgo,
  LIMITES,
  SECCIONES_POR_DEFECTO,
  TONOS,
  type Config,
  type Seccion,
  type Version,
} from "../lib/prompt";
import {
  aplicar,
  detectarConReglas,
  fusionarPropuestas,
  proponerConModelo,
  type Sustitucion,
} from "../lib/anonimizar";
import { generarDocumento, medir, partesIniciales, type ProgresoGeneracion } from "../lib/generar";
import { verificarDocumento } from "../lib/trazabilidad";
import {
  MODELOS,
  MODELO_POR_DEFECTO,
  MODOS,
  type ModoGeneracion,
} from "../lib/modelos";
import {
  contarAceptadas,
  crearReunion,
  guardarDocumento,
  guardarRequerimientos,
  listarProyectos,
  modoDemo,
  obtenerReunion,
} from "../lib/datos";
import { useQuery } from "@tanstack/react-query";
import { useSesion } from "../lib/sesion";
import { PanelDocumento } from "../components/nueva/PanelDocumento";
import { SelectorVersion } from "../components/nueva/SelectorVersion";
import { PanelPrompt } from "../components/nueva/PanelPrompt";
import { PanelAnonimizador } from "../components/nueva/PanelAnonimizador";
import { Button } from "../components/ui/Button";
import { useTitulo } from "../lib/titulo";

const BORRADOR = "r01:borrador";
const ETIQUETA = /(\[[A-Z]+_\d+\])/g;

/** Muestra el texto anonimizado resaltando las etiquetas sustituidas. */
function TextoRevisado({ texto }: { texto: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-[12.5px] leading-relaxed text-ink">
      {texto.split(ETIQUETA).map((trozo, i) =>
        ETIQUETA.test(trozo) ? (
          <mark
            key={i}
            className="rounded bg-accent-soft px-1 py-0.5 font-mono text-[11.5px] text-accent"
          >
            {trozo}
          </mark>
        ) : (
          <span key={i}>{trozo}</span>
        ),
      )}
    </div>
  );
}

export default function Nueva() {
  useTitulo("Nueva reunión");
  const [version, setVersion] = useState<Version>(3);
  const [proyectoId, setProyectoId] = useState("");
  const [dominio, setDominio] = useState("");
  const [secciones, setSecciones] = useState<Seccion[]>(SECCIONES_POR_DEFECTO);
  const [detalle, setDetalle] = useState(0);
  const [tono, setTono] = useState<string>(TONOS[0].valor);
  const [refdoc, setRefdoc] = useState("");
  const [titulo, setTitulo] = useState("");
  const [transcripcion, setTranscripcion] = useState(() => localStorage.getItem(BORRADOR) ?? "");

  /** null = todavía no se ha revisado la anonimización */
  const [subs, setSubs] = useState<Sustitucion[] | null>(null);

  const [progreso, setProgreso] = useState<ProgresoGeneracion | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  const [reunionId, setReunionId] = useState<string | null>(null);
  const [modelo, setModelo] = useState(MODELO_POR_DEFECTO);
  const [modo, setModo] = useState<ModoGeneracion>("completo");
  const [buscandoIa, setBuscandoIa] = useState(false);
  /** En pantallas estrechas los tres paneles no caben: se vuelven pestañas. */
  const [panel, setPanel] = useState<"transcripcion" | "configuracion" | "documento">(
    "configuracion",
  );
  const [avisoIa, setAvisoIa] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);
  const { sesion } = useSesion();

  const proyectos = useQuery({
    queryKey: ["proyectos"],
    queryFn: listarProyectos,
    enabled: !!sesion || modoDemo(),
  });
  const lista = proyectos.data ?? [];
  const elegido = lista.find((p) => p.id === proyectoId) ?? null;
  const proyecto = elegido?.nombre ?? "";

  // Al elegir proyecto se heredan su dominio y su documento de referencia:
  // son los mismos en todas las reuniones del proyecto.
  function elegirProyecto(id: string) {
    setProyectoId(id);
    const p = lista.find((x) => x.id === id);
    if (!p) return;
    if (p.dominio) setDominio(p.dominio);
    if (p.plantilla_md && !refdoc.trim()) setRefdoc(p.plantilla_md);
  }

  // El borrador sobrevive a cerrar el navegador.
  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(BORRADOR, transcripcion), 400);
    return () => clearTimeout(t);
  }, [transcripcion]);

  /**
   * Generar otra versión sobre una reunión que ya existe.
   *
   * Se llega aquí desde Comparar, pulsando una de las versiones que todavía no
   * se ha generado: `/nueva?reunion=<id>&version=<n>`. Sin esto, comparar las
   * tres versiones era imposible en la práctica —solo se podía generar otra sin
   * salir de esta pantalla— y las columnas vacías pedían algo que la aplicación
   * no dejaba hacer.
   *
   * La transcripción que se carga ya viene anonimizada de la reunión original,
   * así que se marca como revisada (`subs = []`): volver a pedir la revisión
   * sobre un texto donde los nombres ya son etiquetas no aporta nada.
   *
   * Se compara la misma entrada con distinto prompt; por eso se reutiliza la
   * reunión en vez de crear una nueva.
   */
  const [params, setParams] = useSearchParams();
  const [cargandoReunion, setCargandoReunion] = useState(false);
  useEffect(() => {
    const id = params.get("reunion");
    if (!id || reunionId === id) return;

    let cancelado = false;
    setCargandoReunion(true);
    (async () => {
      try {
        const r = await obtenerReunion(id);
        if (cancelado || !r) return;

        setReunionId(id);
        setTranscripcion(r.transcripcion_anonimizada ?? "");
        setSubs([]);
        setTitulo(r.titulo ?? "");
        if (r.proyecto_id) setProyectoId(r.proyecto_id);
        if (r.dominio) setDominio(r.dominio);

        const v = Number(params.get("version"));
        if (v === 1 || v === 2 || v === 3) setVersion(v);

        // La versión y la reunión ya están en el estado: se limpian de la URL
        // para que recargar no vuelva a arrastrar la reunión sin querer.
        setParams({}, { replace: true });
      } catch {
        // Si la reunión no existe o no es de este usuario, se sigue como una
        // reunión nueva en blanco: es lo que el usuario puede resolver.
        setParams({}, { replace: true });
      } finally {
        if (!cancelado) setCargandoReunion(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [params, reunionId, setParams]);

  /**
   * Al cargar una reunión existente el proyecto se fija a mano, sin pasar por
   * `elegirProyecto`, así que su documento de referencia no se heredaba y la
   * versión 3 se quedaba sin poder generarse. Esto lo hereda en cuanto la
   * lista de proyectos está disponible.
   */
  useEffect(() => {
    if (!proyectoId || refdoc.trim()) return;
    const p = lista.find((x) => x.id === proyectoId);
    if (p?.plantilla_md) setRefdoc(p.plantilla_md);
  }, [proyectoId, lista, refdoc]);

  const textoFinal = useMemo(
    () => (subs ? aplicar(transcripcion, subs) : transcripcion),
    [subs, transcripcion],
  );

  const config: Config = useMemo(
    () => ({
      version,
      proyecto,
      dominio,
      secciones,
      detalle,
      tono,
      refdoc,
      transcripcion: textoFinal,
    }),
    [version, proyecto, dominio, secciones, detalle, tono, refdoc, textoFinal],
  );

  const prompt = useMemo(() => construir(config), [config]);
  const falta = faltaAlgo(config) ?? (subs ? null : "Revisa la anonimización antes de generar");
  const bloqueado = version === 1;

  async function segundaPasada() {
    if (!subs || buscandoIa) return;
    setBuscandoIa(true);
    setAvisoIa(null);
    try {
      const { propuestas, simulado } = await proponerConModelo(
        transcripcion,
        sesion?.access_token,
      );
      if (simulado) {
        setAvisoIa("Sin API key configurada: la segunda pasada no propone nada.");
      } else if (!propuestas.length) {
        setAvisoIa("El modelo no encontró nada más.");
      } else {
        const antes = subs.length;
        const fusionadas = fusionarPropuestas(transcripcion, subs, propuestas);
        setSubs(fusionadas);
        setAvisoIa(`El modelo añadió ${fusionadas.length - antes} entidades.`);
      }
    } catch (e) {
      setAvisoIa(e instanceof Error ? e.message : "No se pudo consultar al modelo.");
    } finally {
      setBuscandoIa(false);
    }
  }

  async function generar(soloEstas?: number[]) {
    if (corriendo) return;
    setCorriendo(true);
    setGuardado(null);
    const previas = soloEstas
      ? (progreso?.partes ?? partesIniciales(modo))
      : partesIniciales(modo);
    const resultado = await generarDocumento(
      prompt.texto,
      { modelo },
      setProgreso,
      soloEstas,
      previas,
      modo,
    );
    setCorriendo(false);

    // Sin sesión no se guarda: la aplicación sigue siendo usable, pero se avisa.
    if (!sesion) {
      setGuardado("Sin sesión: el documento no se guardó");
      return;
    }
    if (!resultado.documento.trim()) return;

    try {
      let id = reunionId;
      if (!id) {
        id = await crearReunion({
          titulo: titulo.trim() || "Reunión sin título",
          proyectoId: proyectoId || null,
          proyecto,
          dominio,
          transcripcionAnonimizada: textoFinal,
          huboOriginal: !!subs?.length,
          entidadesAnonimizadas: contarAceptadas(subs),
        });
        setReunionId(id);
      }
      const conError = resultado.partes.some((p) => p.estado === "error");
      const docId = await guardarDocumento({
        reunionId: id,
        config,
        ejecucion: { modelo, modo },
        promptEnviado: prompt.texto,
        contenidoMd: resultado.documento,
        metricas: {
          ...medir(resultado.documento, resultado.partes),
          // Se guardan para poder comparar los dos esquemas con datos propios.
          tokens_entrada_aprox:
            Math.round(prompt.texto.length / 4) * (modo === "completo" ? 1 : 6),
        },
        estado: conError ? "parcial" : "completo",
      });
      const n = await guardarRequerimientos(docId, resultado.documento, textoFinal);
      setGuardado(`Guardado · ${n} requerimientos extraídos`);
    } catch (e) {
      setGuardado(e instanceof Error ? `No se pudo guardar: ${e.message}` : "No se pudo guardar");
    }
  }

  const campo =
    "h-9 w-full rounded-md border border-line bg-canvas px-2.5 text-sm text-ink " +
    "placeholder:text-faint focus:border-accent focus:outline-none disabled:opacity-40";

  // En pantalla ancha los tres paneles conviven y las pestañas desaparecen.
  // En la franja intermedia la transcripción se queda fija y se alterna el
  // resto, así que la pestaña de transcripción sobra ahí.
  const pestanas = [
    { id: "transcripcion", texto: "Transcripción", soloEstrecho: true },
    { id: "configuracion", texto: "Configuración", soloEstrecho: false },
    { id: "documento", texto: "Documento", soloEstrecho: false },
  ] as const;

  return (
    <div className="flex h-full flex-col">
      {/* Se llegó desde Comparar para añadir otra versión: hay que decirlo, o
          parece que se está creando una reunión nueva y duplicada.
          Va fuera del contenedor horizontal: como hijo suyo se comía el ancho
          de una de las tres columnas y los paneles se solapaban. */}
      {reunionId && (
        <p
          role="status"
          className="shrink-0 border-b border-line bg-raised px-4 py-2 text-xs text-muted"
        >
          {cargandoReunion
            ? "Cargando la reunión…"
            : `Añadiendo la versión ${version} a «${titulo}». Se reutiliza su transcripción.`}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      {/* Pestañas: solo cuando los tres paneles no caben de lado a lado */}
      <div
        role="tablist"
        aria-label="Secciones de la pantalla"
        className="flex shrink-0 border-b border-line xl:hidden"
      >
        {pestanas.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={panel === t.id}
            onClick={() => setPanel(t.id)}
            className={[
              "flex-1 border-b-2 px-3 py-2.5 text-sm transition-colors duration-150",
              t.soloEstrecho ? "md:hidden" : "",
              panel === t.id
                ? "border-accent font-medium text-ink"
                : "border-transparent text-muted hover:text-ink",
            ].join(" ")}
          >
            {t.texto}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------- transcripción */}
      <section
        aria-label="Transcripción"
        className={[
          "min-w-0 flex-1 flex-col border-line md:flex md:border-r",
          panel === "transcripcion" ? "flex" : "hidden md:flex",
        ].join(" ")}
      >
        <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
          <h2 className="hidden rotulo-menor lg:block">Transcripción</h2>
          <span className="ml-auto font-mono text-[10px] text-faint">
            {prompt.palabrasTranscripcion} palabras
          </span>
          {subs ? (
            <Button variante="fantasma" onClick={() => setSubs(null)} className="h-7 px-2">
              <Pencil size={12} />
              Editar
            </Button>
          ) : (
            <Button
              variante="secundario"
              disabled={!transcripcion.trim()}
              onClick={() => setSubs(detectarConReglas(transcripcion))}
              className="h-7 px-2.5"
            >
              <ShieldCheck size={12} />
              Revisar y anonimizar
            </Button>
          )}
        </header>

        {!subs && (
          <div className="flex items-start gap-2 border-b border-line bg-raised px-4 py-2">
            <Info size={13} className="mt-0.5 shrink-0 text-warn" />
            <p className="text-xs text-muted">
              Pega la transcripción tal cual. No sale nada de aquí hasta que revises la
              anonimización.
            </p>
          </div>
        )}

        {subs ? (
          <>
            <TextoRevisado texto={textoFinal} />
            <PanelAnonimizador
              sustituciones={subs}
              onAlternar={(i) =>
                setSubs(subs.map((s, j) => (i === j ? { ...s, aceptada: !s.aceptada } : s)))
              }
              onTodas={(v) => setSubs(subs.map((s) => ({ ...s, aceptada: v })))}
              onSegundaPasada={() => void segundaPasada()}
              buscando={buscandoIa}
              avisoSegundaPasada={avisoIa}
            />
          </>
        ) : (
          <textarea
            value={transcripcion}
            onChange={(e) => setTranscripcion(e.target.value)}
            placeholder="Pega aquí la transcripción de la reunión de levantamiento…"
            aria-label="Transcripción de la reunión"
            className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-[12.5px] leading-relaxed text-ink placeholder:text-faint focus:outline-none"
          />
        )}
      </section>

      {/* ------------------------------------------- configuración y prompt */}
      <section
        aria-label="Configuración y prompt"
        className={[
          "min-w-0 flex-1 flex-col border-line xl:flex xl:w-[38%] xl:min-w-96 xl:flex-none xl:border-r",
          panel === "configuracion" ? "flex" : "hidden",
          "md:border-r",
        ].join(" ")}
      >
        <header className="flex h-11 shrink-0 items-center border-b border-line px-4">
          <h2 className="rotulo-menor">
            Configuración
          </h2>
        </header>

        <div className="overflow-auto border-b border-line p-4 xl:max-h-[46%] xl:shrink-0">
          <SelectorVersion valor={version} onChange={setVersion} />

          {bloqueado && (
            <p className="mt-3 rounded border border-line bg-raised px-3 py-2 text-xs text-muted">
              La versión mínima no usa configuración. Es su razón de ser: está para ver qué
              pasa sin ella.
            </p>
          )}

          <div className="mt-4">
            <label htmlFor="titulo" className="mb-1 block text-xs font-medium text-muted">
              Título de la reunión
            </label>
            <input
              id="titulo"
              className={campo}
              value={titulo}
              placeholder="Levantamiento control de acceso"
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="proyecto" className="mb-1 block text-xs font-medium text-muted">
                Proyecto
              </label>
              <select
                id="proyecto"
                className={campo}
                value={proyectoId}
                disabled={bloqueado}
                onChange={(e) => elegirProyecto(e.target.value)}
              >
                <option value="">Sin proyecto</option>
                {lista.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              {!lista.length && (
                <p className="mt-1 font-mono text-[10px] text-faint">
                  crea uno en Proyectos para agrupar reuniones
                </p>
              )}
            </div>
            <div>
              <label htmlFor="dominio" className="mb-1 block text-xs font-medium text-muted">
                Dominio del analista
              </label>
              <input
                id="dominio"
                className={campo}
                value={dominio}
                disabled={bloqueado}
                onChange={(e) => setDominio(e.target.value)}
              />
            </div>
          </div>

          <fieldset className="mt-4" disabled={bloqueado}>
            <legend className="mb-2 text-xs font-medium text-muted">
              Secciones exigidas como mínimo
            </legend>
            <div className="flex flex-col gap-1">
              {secciones.map((s, i) => (
                <label
                  key={s.nombre}
                  className="flex cursor-pointer items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    checked={s.activa}
                    onChange={() =>
                      setSecciones(
                        secciones.map((x, j) => (i === j ? { ...x, activa: !x.activa } : x)),
                      )
                    }
                    className="h-3.5 w-3.5 accent-[var(--c-accent)]"
                  />
                  {s.nombre}
                  <code className="ml-auto font-mono text-[10px] text-faint">
                    {s.pref ? `${s.pref}-01…` : s.forma}
                  </code>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="detalle" className="mb-1 block text-xs font-medium text-muted">
                Límite de salida
              </label>
              <select
                id="detalle"
                className={campo}
                value={detalle}
                disabled={bloqueado}
                onChange={(e) => setDetalle(Number(e.target.value))}
              >
                {LIMITES.map((l) => (
                  <option key={l.valor} value={l.valor}>
                    {l.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tono" className="mb-1 block text-xs font-medium text-muted">
                Tono
              </label>
              <select
                id="tono"
                className={campo}
                value={tono}
                disabled={bloqueado}
                onChange={(e) => setTono(e.target.value)}
              >
                {TONOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modelo" className="mb-1 block text-xs font-medium text-muted">
                Modelo
              </label>
              <select
                id="modelo"
                className={campo}
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
              >
                {MODELOS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
              <p className="mt-1 font-mono text-[10px] text-faint">
                {MODELOS.find((m) => m.id === modelo)?.nota}
              </p>
            </div>
            <div>
              <label htmlFor="modo" className="mb-1 block text-xs font-medium text-muted">
                Generación
              </label>
              <select
                id="modo"
                className={campo}
                value={modo}
                onChange={(e) => setModo(e.target.value as ModoGeneracion)}
              >
                {MODOS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
              <p className="mt-1 font-mono text-[10px] text-faint">
                {MODOS.find((m) => m.id === modo)?.llamadas}
              </p>
            </div>
          </div>

          {version === 3 && (
            <div className="mt-4">
              <label htmlFor="refdoc" className="mb-1 block text-xs font-medium text-muted">
                Documento de referencia <span className="text-faint">— obligatorio en v3</span>
              </label>
              <textarea
                id="refdoc"
                value={refdoc}
                onChange={(e) => setRefdoc(e.target.value)}
                placeholder="Pega un documento de requerimientos que sirva de modelo de formato…"
                className="min-h-24 w-full resize-y rounded-md border border-line bg-canvas p-2.5 font-mono text-[11.5px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
          )}
        </div>

        <PanelPrompt prompt={prompt} />

        <div className="flex shrink-0 items-center gap-3 border-t border-line px-4 py-3">
          <Button
            variante="primario"
            disabled={!!falta || corriendo}
            onClick={() => void generar()}
            title={falta ?? "Generar documento"}
          >
            <Play size={14} />
            {corriendo ? "Generando…" : "Generar documento"}
          </Button>
          <span className="font-mono text-[10px] text-faint">
            {guardado ?? falta ?? MODOS.find((m) => m.id === modo)?.llamadas}
          </span>
        </div>
      </section>

      {/* -------------------------------------------------------- documento */}
      <section
        aria-label="Documento generado"
        className={[
          "min-w-0 flex-1 flex-col xl:flex xl:w-[30%] xl:min-w-72 xl:flex-none",
          panel === "documento" ? "flex" : "hidden",
        ].join(" ")}
      >
        <header className="flex h-11 shrink-0 items-center border-b border-line px-4">
          <h2 className="rotulo-menor">Documento</h2>
        </header>
        <PanelDocumento
          anclaje={
            progreso?.documento
              ? (() => {
                  const v = verificarDocumento(progreso.documento, textoFinal);
                  return { anclados: v.filter((x) => x.respaldo.respaldado).length, total: v.length };
                })()
              : null
          }
          progreso={progreso}
          corriendo={corriendo}
          onReintentar={(i) => void generar([i])}
          meta={{
            proyecto: proyecto || "Proyecto",
            reunion: titulo || "Reunión sin título",
            version,
            fecha: new Date().toISOString().slice(0, 10),
          }}
        />
        </section>
      </div>
    </div>
  );
}
