import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, Moon, Sun } from "lucide-react";
import { useSesion } from "../lib/sesion";
import { aplicarTema, temaGuardado, type Tema } from "../lib/theme";

type Modo = "entrar" | "registrar";

/**
 * El panel de la izquierda no describe la herramienta: la enseña. Es el mismo
 * recorrido que hace la aplicación —lo que se dijo en la reunión pasa a ser un
 * requerimiento numerado, con su porcentaje de coincidencia— y es lo único
 * llamativo de la pantalla. El resto se mantiene callado.
 */
function Muestra() {
  return (
    <aside className="panel-obra relative hidden flex-col justify-between overflow-hidden border-r border-line p-8 md:flex md:w-[44%] lg:p-10">
      <div className="asoma">
        <p className="font-display text-[26px] font-bold leading-none tracking-tight text-ink">
          Ancla
        </p>
        <p className="mt-1.5 rotulo-menor">
          Levantamiento de requerimientos
        </p>
      </div>

      <div className="max-w-md">
        <p className="mb-6 rotulo-menor">
          Lo que se dijo · lo que queda escrito
        </p>

        {/* Lo dicho */}
        <div className="asoma" style={{ animationDelay: "80ms" }}>
          <p className="font-mono text-[11px] text-faint">[00:03:40] cliente</p>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">
            «Necesitamos que quede{" "}
            <span className="bg-accent-soft px-1 text-ink underline decoration-accent decoration-2 underline-offset-4">
              auditoría de quién abre el molinete manualmente y a qué hora
            </span>
            .»
          </p>
        </div>

        {/* El trazo que une una cosa con la otra */}
        <div className="my-4 flex h-10 items-stretch pl-6">
          <div className="trazo w-px bg-accent" />
        </div>

        {/* Lo escrito */}
        <div
          className="asoma rounded border border-line bg-surface p-4"
          style={{ animationDelay: "560ms" }}
        >
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] font-semibold text-accent">RF-02</span>
            <span className="rotulo-menor">
              funcional · must
            </span>
          </div>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
            El sistema debe registrar auditoría de cada apertura manual del molinete con
            usuario y hora.
          </p>
          <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-2.5 font-mono text-[10px] text-faint">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            coincidencia con la transcripción 87%
          </p>
        </div>
      </div>

      <p className="max-w-md text-[13px] leading-relaxed text-faint">
        Ningún requerimiento sin algo que lo respalde. Lo que nadie dijo se marca, no se
        cuela.
      </p>
    </aside>
  );
}

export default function Acceso() {
  const { sesion, cargando, entrar, registrar } = useSesion();
  const ubicacion = useLocation();
  const [tema, setTema] = useState<Tema>(() => temaGuardado());

  const [modo, setModo] = useState<Modo>("entrar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  if (cargando) return <PantallaCargando />;
  if (sesion) {
    const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? "/reuniones";
    return <Navigate to={destino} replace />;
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      if (modo === "entrar") {
        await entrar(correo, clave);
      } else {
        const { confirmar } = await registrar(correo, clave, nombre);
        if (confirmar) {
          setAviso("Cuenta creada. Confirma el correo y vuelve a entrar.");
          setModo("entrar");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const campo =
    "h-11 w-full border-0 border-b border-line bg-transparent px-0 text-[15px] text-ink " +
    "transition-colors duration-150 placeholder:text-faint focus:border-accent focus:outline-none";
  const etiqueta = "block rotulo-menor";

  return (
    <div className="flex min-h-screen bg-canvas">
      <Muestra />

      <main className="flex min-w-0 flex-1 flex-col px-6 py-8 sm:px-12">
        <div className="flex items-start justify-between">
          <div className="md:hidden">
            <p className="font-display text-xl font-bold tracking-tight text-ink">Ancla</p>
            <p className="rotulo-menor">
              Levantamiento de requerimientos
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTema(tema === "oscuro" ? "claro" : "oscuro")}
            aria-label={tema === "oscuro" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
          >
            {tema === "oscuro" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <div className="flex flex-1 items-center">
          <div className="w-full max-w-[340px]">
            <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink">
              {modo === "entrar" ? "Entrar" : "Crear cuenta"}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {modo === "entrar"
                ? "Tus reuniones y documentos solo los ves tú."
                : "Con tu correo basta. Nada de lo que subas se comparte."}
            </p>

            <form onSubmit={enviar} className="mt-9 flex flex-col gap-6">
              {modo === "registrar" && (
                <div>
                  <label htmlFor="nombre" className={etiqueta}>
                    Nombre
                  </label>
                  <input
                    id="nombre"
                    className={campo}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="correo" className={etiqueta}>
                  Correo
                </label>
                <input
                  id="correo"
                  type="email"
                  className={campo}
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="clave" className={etiqueta}>
                  Contraseña
                </label>
                <input
                  id="clave"
                  type="password"
                  className={campo}
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                />
                {modo === "registrar" && (
                  <p className="mt-1.5 font-mono text-[10px] text-faint">mínimo 6 caracteres</p>
                )}
              </div>

              {error && (
                <p role="alert" className="flex items-start gap-2 text-sm text-danger">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {error}
                </p>
              )}
              {aviso && (
                <p role="status" className="flex items-start gap-2 text-sm text-ok">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                  {aviso}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="mt-1 flex h-11 items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-accent-ink transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
              >
                {enviando && <Loader2 size={15} className="animate-spin" />}
                {modo === "entrar" ? "Entrar" : "Crear cuenta"}
              </button>
            </form>

            <p className="mt-8 border-t border-line pt-5 text-sm text-muted">
              {modo === "entrar" ? "¿Todavía no tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setModo(modo === "entrar" ? "registrar" : "entrar");
                  setError(null);
                  setAviso(null);
                }}
                className="font-medium text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
              >
                {modo === "entrar" ? "Crear una" : "Entrar"}
              </button>
            </p>
          </div>
        </div>

        <p className="font-mono text-[10px] text-faint">
          Proyecto de Aplicación · Fase 2 · Corporación Universitaria de Asturias
        </p>
      </main>
    </div>
  );
}

export function PantallaCargando() {
  return (
    <div className="flex min-h-full items-center justify-center bg-canvas">
      <p className="flex items-center gap-2 rotulo">
        <Loader2 size={14} className="animate-spin" />
        Abriendo sesión
      </p>
    </div>
  );
}
