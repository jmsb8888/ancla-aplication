import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, FolderGit2, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  actualizarProyecto,
  borrarProyecto,
  crearProyecto,
  listarProyectos,
  modoDemo,
  type Proyecto,
} from "../lib/datos";
import { crearCarpetaDeProyecto } from "../lib/drive";
import { useSesion } from "../lib/sesion";
import { useTitulo } from "../lib/titulo";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";

const vacio = {
  nombre: "",
  cliente: "",
  dominio: "",
  carpeta_drive: "",
  plantilla_md: "",
};

type Borrador = typeof vacio;

export default function Proyectos() {
  useTitulo("Proyectos");
  const { sesion } = useSesion();
  const cliente = useQueryClient();

  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** El proyecto se creó, pero su carpeta de Drive no. No es un fallo del alta. */
  const [avisoCarpeta, setAvisoCarpeta] = useState<string | null>(null);

  const consulta = useQuery({
    queryKey: ["proyectos"],
    queryFn: listarProyectos,
    enabled: !!sesion || modoDemo(),
  });

  const refrescar = () => cliente.invalidateQueries({ queryKey: ["proyectos"] });

  const guardar = useMutation({
    mutationFn: async (b: Borrador): Promise<string | null> => {
      if (editando) {
        await actualizarProyecto(editando, b);
        return null;
      }

      // Primero la fila, después la carpeta.
      //
      // El orden importa: si el nombre ya existe, el índice único rechaza el
      // insert. Creando la carpeta antes, esa carpeta se quedaba en Drive sin
      // proyecto que la reclamara, y como Drive admite nombres repetidos nadie
      // se enteraba. Creando la fila primero, un nombre repetido falla sin
      // dejar rastro.
      const creado = await crearProyecto({ ...b, carpeta_drive: b.carpeta_drive.trim() });

      // Sin carpeta escrita a mano, la automatización crea una con el nombre
      // del proyecto dentro de la carpeta madre. Se pide una sola vez, aquí,
      // porque Drive admite nombres repetidos y no deduplica por su cuenta.
      if (creado.carpeta_drive || modoDemo()) return null;

      try {
        const carpeta = await crearCarpetaDeProyecto(creado.nombre);
        await actualizarProyecto(creado.id, { carpeta_drive: carpeta });
        return null;
      } catch (e) {
        // El proyecto ya existe y sirve: poder trabajar pesa más que archivar.
        // Queda sin carpeta y se avisa; se puede pegar el id a mano editándolo.
        return e instanceof Error ? e.message : "No se pudo crear la carpeta en Drive.";
      }
    },
    onSuccess: (problema) => {
      setBorrador(null);
      setEditando(null);
      setError(null);
      setAvisoCarpeta(problema);
      void refrescar();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  const eliminar = useMutation({
    mutationFn: borrarProyecto,
    onSuccess: () => void refrescar(),
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo borrar"),
  });

  if (!sesion && !modoDemo()) {
    return (
      <EmptyState
        icono={FolderGit2}
        titulo="Vista previa sin sesión"
        descripcion="Los proyectos agrupan tus reuniones. Inicia sesión para gestionarlos."
      />
    );
  }

  const proyectos = consulta.data ?? [];

  function abrirNuevo() {
    setEditando(null);
    setBorrador({ ...vacio });
    setError(null);
  }

  function abrirEdicion(p: Proyecto) {
    setEditando(p.id);
    setBorrador({
      nombre: p.nombre,
      cliente: p.cliente,
      dominio: p.dominio,
      carpeta_drive: p.carpeta_drive,
      plantilla_md: p.plantilla_md,
    });
    setError(null);
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!borrador?.nombre.trim()) {
      setError("El proyecto necesita un nombre.");
      return;
    }
    guardar.mutate(borrador);
  }

  const campo =
    "h-9 w-full rounded-md border border-line bg-canvas px-2.5 text-sm text-ink " +
    "placeholder:text-faint focus:border-accent focus:outline-none";

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Cada proyecto agrupa sus reuniones, hereda su dominio y su plantilla, y archiva
          en su propia carpeta de Drive.
        </p>
        {!borrador && (
          <Button variante="primario" onClick={abrirNuevo} className="shrink-0">
            <Plus size={14} />
            Nuevo proyecto
          </Button>
        )}
      </div>

      {avisoCarpeta && (
        <p
          role="status"
          className="mb-5 flex items-start gap-2 rounded-lg border border-line bg-surface p-3 text-sm text-muted"
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-danger" />
          <span>
            El proyecto quedó creado, pero su carpeta de Drive no: {avisoCarpeta} Puedes
            pegar el id de una carpeta a mano editando el proyecto.
          </span>
        </p>
      )}

      {borrador && (
        <form
          onSubmit={enviar}
          className="mb-5 rounded-lg border border-line bg-surface p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              {editando ? "Editar proyecto" : "Nuevo proyecto"}
            </h2>
            <button
              type="button"
              onClick={() => setBorrador(null)}
              aria-label="Cancelar"
              className="text-faint hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nombre" className="mb-1 block text-xs font-medium text-muted">
                Nombre
              </label>
              <input
                id="nombre"
                className={campo}
                value={borrador.nombre}
                onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                placeholder="Proyecto ACCESO"
                required
              />
            </div>
            <div>
              <label htmlFor="cliente" className="mb-1 block text-xs font-medium text-muted">
                Cliente
              </label>
              <input
                id="cliente"
                className={campo}
                value={borrador.cliente}
                onChange={(e) => setBorrador({ ...borrador, cliente: e.target.value })}
                placeholder="Planta industrial"
              />
            </div>
            <div>
              <label htmlFor="dominio" className="mb-1 block text-xs font-medium text-muted">
                Dominio del analista
              </label>
              <input
                id="dominio"
                className={campo}
                value={borrador.dominio}
                onChange={(e) => setBorrador({ ...borrador, dominio: e.target.value })}
                placeholder="sistemas de control de acceso"
              />
              <p className="mt-1 font-mono text-[10px] text-faint">
                se propone al crear cada reunión
              </p>
            </div>
            <div>
              <label htmlFor="carpeta" className="mb-1 block text-xs font-medium text-muted">
                Carpeta de Drive
              </label>
              <input
                id="carpeta"
                className={campo}
                value={borrador.carpeta_drive}
                onChange={(e) => setBorrador({ ...borrador, carpeta_drive: e.target.value })}
                placeholder="1AbCdEfGhIjKlMnOp"
              />
              <p className="mt-1 font-mono text-[10px] text-faint">
                {editando
                  ? "id de la carpeta, el que sale en su URL"
                  : "si lo dejas vacío se crea una carpeta con el nombre del proyecto"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="plantilla" className="mb-1 block text-xs font-medium text-muted">
              Documento de referencia <span className="text-faint">— lo usa la versión 3</span>
            </label>
            <textarea
              id="plantilla"
              value={borrador.plantilla_md}
              onChange={(e) => setBorrador({ ...borrador, plantilla_md: e.target.value })}
              placeholder="Pega aquí el documento que sirve de modelo de formato para este proyecto…"
              className="min-h-28 w-full resize-y rounded-md border border-line bg-canvas p-2.5 font-mono text-[11.5px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-danger">
              <AlertCircle size={14} />
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <Button variante="primario" type="submit" disabled={guardar.isPending}>
              {guardar.isPending && <Loader2 size={14} className="animate-spin" />}
              {editando ? "Guardar cambios" : "Crear proyecto"}
            </Button>
            <Button type="button" onClick={() => setBorrador(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {consulta.isPending ? (
        <p className="flex items-center justify-center gap-2 py-16 font-mono text-xs text-faint">
          <Loader2 size={14} className="animate-spin" /> Cargando proyectos
        </p>
      ) : !proyectos.length && !borrador ? (
        <EmptyState
          icono={FolderGit2}
          titulo="Sin proyectos"
          descripcion="Antes de registrar reuniones conviene crear el proyecto al que pertenecen: así se agrupan, comparten plantilla y archivan en la carpeta correcta."
          accion={
            <Button variante="primario" onClick={abrirNuevo}>
              Crear el primero
            </Button>
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-line bg-surface">
          {proyectos.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{p.nombre}</p>
                <p className="truncate font-mono text-[11px] text-faint">
                  {p.cliente || "sin cliente"}
                  {p.dominio && ` · ${p.dominio}`}
                  {p.carpeta_drive ? " · archiva en Drive" : " · sin carpeta de Drive"}
                  {p.plantilla_md ? " · con plantilla" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => abrirEdicion(p)}
                aria-label={`Editar ${p.nombre}`}
                className="flex h-8 w-8 items-center justify-center rounded border border-line text-muted hover:bg-raised hover:text-ink"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      `¿Borrar «${p.nombre}»? Sus reuniones se conservan, pero quedan sin proyecto.`,
                    )
                  ) {
                    eliminar.mutate(p.id);
                  }
                }}
                aria-label={`Borrar ${p.nombre}`}
                className="flex h-8 w-8 items-center justify-center rounded border border-line text-muted hover:border-danger hover:text-danger"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
