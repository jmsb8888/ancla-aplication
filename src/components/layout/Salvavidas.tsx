import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface Estado {
  error: Error | null;
}

/**
 * Sin esto, cualquier error de render deja la pantalla en blanco y el usuario
 * no sabe si la aplicación se cayó o si su documento se perdió. Aquí al menos
 * se le dice qué pasó y se le ofrece salir sin cerrar el navegador.
 */
export class Salvavidas extends Component<Props, Estado> {
  state: Estado = { error: null };

  static getDerivedStateFromError(error: Error): Estado {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // En producción esto es lo único que queda del fallo: conviene que salga.
    console.error("Error no controlado:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-full items-center justify-center bg-canvas px-6 py-16">
        <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <AlertOctagon size={16} className="text-danger" />
            Algo se rompió en esta pantalla
          </p>
          <p className="text-sm text-muted">
            El resto de la aplicación sigue funcionando y nada de lo guardado se perdió.
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded border border-line bg-canvas p-2 font-mono text-[10px] text-faint">
            {this.state.error.message}
          </pre>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="h-9 rounded-md border border-line px-3 text-sm text-ink hover:bg-raised"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/reuniones";
              }}
              className="h-9 rounded-md border border-accent bg-accent px-3 text-sm text-accent-ink hover:bg-accent-hover"
            >
              Ir a mis reuniones
            </button>
          </div>
        </div>
      </div>
    );
  }
}
