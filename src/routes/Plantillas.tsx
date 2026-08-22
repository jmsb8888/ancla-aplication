import { FileStack } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { useTitulo } from "../lib/titulo";

export default function Plantillas() {
  useTitulo("Plantillas");
  return (
    <EmptyState
      icono={FileStack}
      titulo="Sin plantillas guardadas"
      descripcion="Una plantilla es un documento de requerimientos que sirve de modelo de formato. La versión 3 del prompt lo necesita para replicar su estructura."
      detalle="Guarda aquí los documentos que quieras reutilizar como referencia"
      accion={<Button disabled>Nueva plantilla</Button>}
    />
  );
}
