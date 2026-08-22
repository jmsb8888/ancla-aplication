import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { RutaProtegida } from "./components/layout/RutaProtegida";
import Acceso from "./routes/Acceso";
import Reuniones from "./routes/Reuniones";
import Reunion from "./routes/Reunion";
import Nueva from "./routes/Nueva";
import Comparar from "./routes/Comparar";
import Metricas from "./routes/Metricas";
import Plantillas from "./routes/Plantillas";
import Proyectos from "./routes/Proyectos";

export default function App() {
  return (
    <Routes>
      <Route path="/acceso" element={<Acceso />} />

      {/* Solo en desarrollo: permite revisar las pantallas sin iniciar sesion.
          Vite lo elimina al compilar, no llega al despliegue. */}
      {import.meta.env.DEV && (
        <Route path="/vista" element={<AppShell />}>
          <Route path="nueva" element={<Nueva />} />
          <Route path="reuniones" element={<Reuniones />} />
          <Route path="reuniones/:id" element={<Reunion />} />
          <Route path="comparar" element={<Comparar />} />
          <Route path="metricas" element={<Metricas />} />
          <Route path="plantillas" element={<Plantillas />} />
          <Route path="proyectos" element={<Proyectos />} />
        </Route>
      )}

      <Route
        element={
          <RutaProtegida>
            <AppShell />
          </RutaProtegida>
        }
      >
        <Route index element={<Navigate to="/reuniones" replace />} />
        <Route path="/reuniones" element={<Reuniones />} />
        <Route path="/reuniones/:id" element={<Reunion />} />
        <Route path="/nueva" element={<Nueva />} />
        <Route path="/comparar" element={<Comparar />} />
        <Route path="/metricas" element={<Metricas />} />
        <Route path="/plantillas" element={<Plantillas />} />
        <Route path="/proyectos" element={<Proyectos />} />
        <Route path="*" element={<Navigate to="/reuniones" replace />} />
      </Route>
    </Routes>
  );
}
