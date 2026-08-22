import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * En Vercel, los archivos de `/api` se despliegan solos como funciones. El
 * servidor de desarrollo de Vite no las conoce, así que este puente las monta
 * en local con la misma firma. Solo corre en desarrollo.
 */
function apiLocal(): Plugin {
  return {
    name: "api-local",
    configureServer(servidor: ViteDevServer) {
      servidor.middlewares.use(async (req, res, next) => {
        const ruta = (req.url ?? "").split("?")[0];
        if (!ruta.startsWith("/api/")) return next();

        const nombre = ruta.slice(5).replace(/[^a-zA-Z0-9_-]/g, "");
        try {
          const modulo = await servidor.ssrLoadModule(`/api/${nombre}.ts`);
          const cuerpo = await leerCuerpo(req);

          const peticion = {
            method: req.method,
            headers: req.headers as Record<string, string | string[] | undefined>,
            body: cuerpo,
          };

          const respuesta = {
            status(codigo: number) {
              res.statusCode = codigo;
              return respuesta;
            },
            json(datos: unknown) {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(datos));
            },
          };

          await modulo.default(peticion, respuesta);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : "Error en la función local",
            }),
          );
        }
      });
    },
  };
}

function leerCuerpo(req: { on: (e: string, f: (c?: Buffer) => void) => void }): Promise<unknown> {
  return new Promise((resolver) => {
    const trozos: Buffer[] = [];
    req.on("data", (c) => c && trozos.push(c));
    req.on("end", () => {
      if (!trozos.length) return resolver(undefined);
      try {
        resolver(JSON.parse(Buffer.concat(trozos).toString("utf8")));
      } catch {
        resolver(undefined);
      }
    });
  });
}

export default defineConfig(({ mode }) => {
  // Vite carga .env.local en import.meta.env (el navegador), no en process.env.
  // Las funciones de /api corren en Node dentro de este mismo proceso y leen
  // process.env: sin esto, la API key estaría en el archivo y el servidor
  // seguiría simulando.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [react(), tailwindcss(), apiLocal()],
    server: { port: 5173 },
  };
});
