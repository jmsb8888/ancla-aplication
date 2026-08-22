import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { ProveedorSesion } from "./lib/sesion";
import { ProveedorTitulo } from "./lib/titulo";
import { aplicarTema, temaGuardado } from "./lib/theme";
import "./index.css";

aplicarTema(temaGuardado());

const cliente = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <BrowserRouter>
        <ProveedorSesion>
          <ProveedorTitulo>
            <App />
          </ProveedorTitulo>
        </ProveedorSesion>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
