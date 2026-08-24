# Estado del proyecto — R-01

> Archivo de control. Se actualiza al terminar cada etapa. Si se pierde la sesión,
> este archivo dice exactamente dónde quedamos y qué sigue.
>
> **Última actualización:** 2026-08-22 · Circuito completo verificado en producción

---

## ✅ Estado — 22/08/2026

**Todo el circuito está verificado en producción, mirando el resultado, no
suponiéndolo.** No queda nada pendiente de comprobar.

### El PDF, verificado abriéndolo

`d530d2e` corrigió los anchos de columna (pdfmake solo acepta `'auto'`, `'*'` o
**números**; se le pasaban `'2*'` y rechazaba el documento entero con
`unsupported number`, así que no llegaba nada a Drive).

Comprobado en el navegador con el documento real, las cuatro páginas:

- Los rótulos (`Proyecto:`, `Cliente:`, `Molinete:`, `RF-01`) salen **en negrita**.
- La tabla de requerimientos respira: descripción ancha, código y prioridad
  estrechos. Antes se partía cada cuatro palabras.
- No queda ningún `---` impreso como texto; son líneas horizontales.
- La matriz de trazabilidad y la nota de cierre maquetan bien.

El PDF bueno en Drive es el de **46 KB**. El de 45 KB es el defectuoso de la
ronda anterior y se puede borrar.

### Lo que funciona y está verificado en producción

Recorrido completo con sesión real: proyecto → carpeta creada sola en Drive →
transcripción → anonimizado (71 apariciones sustituidas, 0 fugas) → prompt v3
4/4 capas → modelo real → documento → guardado en Supabase (reunión + documento +
6 requerimientos) → trazabilidad 100 % con cita textual → PDF → Make → carpeta
del proyecto.

### Cola de trabajo, por orden

Nada de esto impide usar la aplicación. Son deudas, no fallos.

1. **El webhook no está protegido.** `AUTOMATION_SECRET` sigue vacío en Vercel
   **y** los dos escenarios de Make no validan la cabecera `X-Webhook-Secret`.
   Hoy la única protección es que la URL no se conozca. Hay que cerrar las dos
   puntas a la vez: poner el valor en Vercel y añadir el filtro en cada
   escenario. Arreglar solo una de las dos rompe el archivado.
2. **Avisos del linter de Supabase** (0 errores, 7 avisos):
   - `search_path` sin fijar en `tocar_updated_at`
   - `crear_perfil` y `rls_auto_enable` ejecutables por `anon` y `authenticated`
     siendo `SECURITY DEFINER` — hay que revocar `EXECUTE`
   - protección de contraseñas filtradas y MFA desactivadas (ajustes de Auth,
     se activan desde el panel de Supabase)
3. **`/api` sin límite de peticiones por usuario.** Con sesión válida se puede
   llamar al modelo sin tope. Es cuota, no seguridad, pero conviene antes de
   enseñarla a nadie más.
4. **La tabla `exportaciones` no se escribe.** Existe con RLS y nadie inserta en
   ella: cada exportación a PDF/Word/Markdown debería dejar su fila.
5. **Restos de prueba.** En Drive, dentro de `Ancla R-01`: `prueba-ancla.txt`,
   `Proyecto de prueba API`, una carpeta `Proyecto ACCESO` duplicada (la de las
   10:50) y dos PDF con el mismo nombre (el bueno es el de 46 KB). En Supabase,
   dos reuniones de prueba con cuatro documentos.

### Ideas que no son deuda, por si hacen falta

- **Subir el `.docx` desde la aplicación.** Hoy el documento de referencia se
  pega como texto; el Word hay que convertirlo aparte. Con el convertidor ya
  escrito (`material-md/_scripts/docx2md.py`) sería añadir el botón.
- **Plantillas compartidas entre proyectos.** Se retiró la pantalla porque la
  plantilla por proyecto cubre el caso; si aparecen varios clientes con el mismo
  formato, volvería a tener sentido.

### Cómo levantar el entorno

```bash
cd "C:\Users\Usuario\Downloads\ESPECIALIZACION\DIPLOMADO\dos\app-r01" && npm run dev
```

Credenciales en `.env.local`, que no se sube. En Vercel están las nueve
variables, todas con valor salvo `AUTOMATION_SECRET`.

**Advertencia que vale la pena releer:** hoy fallaron seis cosas que habían
pasado una comprobación indirecta. Que un artefacto exista, que pese lo razonable
o que una función devuelva `200` no dice nada de si el resultado sirve. Hay que
abrir el documento y mirarlo.

---

## Resumen

| Etapa | Qué es | Estado |
|---|---|---|
| 1 | Base: Vite + React + TS + Tailwind, tokens, rutas, layout, modo oscuro | ✅ desplegada en Vercel |
| 2 | Datos y sesión: SQL de Supabase con RLS, registro, login, ruta protegida | ✅ probada en producción con sesión real |
| 3 | Motor: constructor de prompts, `/api/generate`, generación | ✅ con la API key real, documento completo |
| 4 | Historial: listado, detalle, búsqueda, filtros, exportar PDF/Word/MD | ✅ guardado, listado y PDF verificados abriendo el archivo |
| 5 | Anonimizador: dos pasadas + panel de revisión | ✅ 71 apariciones sustituidas, 0 fugas |
| 6 | Trazabilidad, comparación de versiones y tablero de métricas | ✅ 100 % respaldado con cita textual |
| 7 | Automatización a Drive por webhook | ✅ dos escenarios en Make, PDF archivado en la carpeta del proyecto |
| 8 | Pulido de interfaz pantalla por pantalla | ✅ crítica de diseño aplicada |
| 9 | Proyectos: agrupar reuniones, plantilla y carpeta de Drive por proyecto | ✅ terminada |

Leyenda: ✅ terminada · 🔨 en curso · ⏸ bloqueada · ⏳ pendiente

---

## Etapa 9 · Proyectos — paso a paso

Se registra aquí el avance para poder retomar en cualquier punto.

| # | Paso | Estado |
|---|------|--------|
| 9.1 | Migración: tabla `proyectos`, `reuniones.proyecto_id`, RLS e índices | ✅ |
| 9.2 | Aplicar la migración a Supabase | ✅ aplicada con autorización de José |
| 9.3 | Regenerar los tipos de TypeScript desde la base | ✅ `proyectos` y `proyecto_id` presentes |
| 9.4 | Capa de datos: crear, listar, editar y borrar proyectos | ✅ |
| 9.5 | Pantalla de proyectos y selector al crear una reunión | ✅ verificada en el navegador |
| 9.6 | Filtro por proyecto en Reuniones y en Métricas | ✅ |
| 9.7 | Carpeta de Drive por proyecto: viaja en el webhook | ✅ campo `carpeta` en el envío |
| 9.8 | Plantilla de referencia heredada del proyecto (la que usa la v3) | ✅ se hereda al elegir proyecto |

**Por qué:** hoy `proyecto` es texto libre que se reescribe en cada reunión. Dos tipeos
distintos crean dos proyectos, no se pueden agrupar reuniones, las métricas son globales
y todo va a la misma carpeta de Drive. El brief describe una empresa que atiende varios
clientes corporativos: multiproyecto es el caso real.

## Lo que necesito de José (bloquea etapas)

- [x] **Cuenta de Google AI Studio** → `GEMINI_API_KEY` en `.env.local`, modelo `gemini-3.6-flash`.
- [x] **Proyecto en Supabase** → `ancla-r01` (`bbztgsidjqrhshqmpqqh`, us-east-2, Postgres 17). Credenciales ya en `.env.local`.
- [x] **Escenarios en Make** → *Documentos a Drive* (6019990) y *Carpeta de proyecto* (6020186), ambos activos y probados. `AUTOMATION_WEBHOOK_URL`, `AUTOMATION_CARPETA_WEBHOOK_URL`, `AUTOMATION_SECRET` y `DRIVE_CARPETA_POR_DEFECTO` en `.env.local`.
- [x] **Cuenta de Vercel** → proyecto `ancla-aplication`, despliegue automático desde `main` de `jmsb8888/ancla-aplication`.
- [x] **`GEMINI_API_KEY` en Vercel** — la pegó José el 22/08/2026. Las variables se leen en el momento del despliegue, así que un cambio de valor **no surte efecto hasta redesplegar**.
- [ ] **`AUTOMATION_SECRET` en Vercel** sigue vacío. Hoy no rompe nada porque los escenarios de Make no validan la cabecera; queda pendiente cerrar las dos puntas a la vez.

Las credenciales van en `.env.local`, que **nunca** se sube al repositorio.

---

## Decisiones tomadas

| Decisión | Elegido | Por qué |
|---|---|---|
| Backend | Función mínima en `/api` de Vercel | La API key de Google no puede llegar al navegador |
| Base de datos | Supabase directo desde el frontend | Con RLS no hace falta backend para datos |
| Login | Supabase Auth, correo y contraseña | El proyecto maneja datos de clientes; refuerza la sección de privacidad del brief |
| Google Drive | Webhook a Make o n8n | La automatización es tema del curso y evita configurar OAuth de Google Cloud |
| Modelo | `gemini-3.6-flash` por defecto; 3.5 Flash-Lite para el anonimizado | Verificado en la documentación el 21/08/2026: el 2.5 que usaba estaba dos generaciones atrás |
| Generación | **Una llamada** por defecto; seis partes como opción | El troceado venía del tope de 1.000 tokens del artefacto; los modelos actuales dan 65.536 de salida |
| Pruebas unitarias | No se escriben | Decisión de José: prioridad a la entrega |
| Acento visual | Verde petróleo profundo | Sobrio, poco visto, se ve bien en modo oscuro (el video se graba así) |
| Modo oscuro | Grises neutros, no teñidos | Petición de José: el color lo pone el acento, no el fondo |
| Tipografía | Instrument Sans · Inter · IBM Plex Mono | La monoespaciada en mayúsculas por todo era lo que hacía que pareciera un boceto |
| Estilo del prototipo | Se descarta el diseño, se conserva la lógica | Decisión de José |
| Carpeta | `dos/app-r01/` | Todo el proyecto junto al material del diplomado |
| Nombre del producto | **Ancla**; `R-01` queda como código del proyecto dentro de los documentos | Había tres marcas distintas conviviendo; el código solo significa algo en el documento |
| Versión | 2.0.0 | La Fase 1 fue el prototipo; esta aplicación es la segunda versión |

---

## Bitácora

### 2026-08-21 — Etapa 1 terminada

- Entorno verificado: Node 20.19.5, npm 10.8.2, git 2.51.1.
- Sin cuentas creadas todavía: se arrancó por la etapa 1, que no necesita ninguna.
- Proyecto creado a mano (sin `create vite`) para evitar prompts interactivos.
- Stack instalado: Vite 6.4.3, React 18, TypeScript 5.6, Tailwind 4 (plugin de Vite),
  React Router 6, TanStack Query 5, lucide-react. 99 paquetes.
- Tokens de diseño en `src/index.css`: paleta semántica en variables CSS, con juego
  completo para modo claro y oscuro. Acento verde petróleo (`#0e6f78` claro,
  `#2fa5b0` oscuro). Tipografías Inter y JetBrains Mono.
- Layout: barra lateral con las cinco secciones, barra superior con búsqueda,
  interruptor de tema (recordado en localStorage) y acceso a cuenta.
- Cinco rutas con estados vacíos escritos uno por uno. La pantalla `Nueva` ya monta
  la disposición de tres paneles.
- Verificado: `tsc --noEmit` sin errores; servidor de desarrollo levantado y navegado
  en el navegador; navegación entre rutas correcta; consola sin errores.

**Pendiente de esta etapa:** desplegar en Vercel (requiere cuenta de José).

### 2026-08-21 — Etapa 2 en curso

- Proyecto Supabase `ancla-r01` creado por José; CLI enlazado (`supabase link`).
- Migración `20260821203000_esquema_inicial.sql` aplicada con `db push`, autorizada por
  José. Crea 6 tablas, 2 funciones, 3 disparadores, 11 índices, RLS en las 6 tablas y
  23 políticas.
- Verificado contra la base real con `gen types typescript --linked`: las 6 tablas
  aparecen en `src/lib/database.types.ts` (419 líneas).
- `.env.local` escrito con la URL y la anon key. Está en `.gitignore`.
- Código de sesión: cliente tipado (`lib/supabase.ts`), contexto de sesión con
  traducción de errores al español (`lib/sesion.tsx`), pantalla de acceso con registro
  e inicio (`routes/Acceso.tsx`), ruta protegida que recuerda a dónde ibas, y menú de
  cuenta con cierre de sesión en la barra superior.
- Verificado en el navegador con pestaña limpia: entrar a `/reuniones` sin sesión
  redirige a `/acceso`, y la consola queda sin errores.

**Pendiente de esta etapa:** que José cree su cuenta en la aplicación y comprobar el
aislamiento entre dos usuarios distintos.

### 2026-08-21 — Motor de prompts (etapa 3, primera mitad)

- `src/lib/prompt.ts`: constructor migrado del prototipo. Tres versiones, las nueve
  restricciones, las seis partes del troceado, conteo de capas y validación de lo que
  falta antes de generar.
- **Verificación de la migración:** un script compara los 29 fragmentos de texto del
  original contra el nuevo motor, ignorando saltos de línea y concatenaciones del
  código. Resultado: 29 de 29 migrados sin cambiar una palabra. El script quedó en
  `_scripts/verificar_prompt.py` (fuera del proyecto, en el material).
- Pantalla `Nueva` completa: transcripción con borrador automático en el navegador,
  selector de versión con contador de capas, configuración que se deshabilita en v1,
  documento de referencia solo en v3, y el prompt en vivo con cada bloque etiquetado
  y el bloque nuevo resaltado en color de acento.
- Verificado en el navegador: al escribir, el prompt se arma (27 palabras → 2176
  caracteres, 4/4 capas, 6 bloques, el de "ejemplo de formato" marcado como nuevo).
  Al pasar a v1 quedan 2 bloques, 1/4 capas y 3 controles deshabilitados.

**Ruta temporal de desarrollo:** `/vista/*` muestra las pantallas sin iniciar sesión,
para poder revisarlas mientras no hay cuenta creada. Solo existe en desarrollo (`DEV`),
Vite la elimina al compilar. **Quitarla antes de la entrega final.**

**Pendiente de esta etapa:** la función `/api/generate` y la API key de Google.

### 2026-08-21 — Anonimizador y motor de generación

**Anonimizador determinista** (`src/lib/anonimizar.ts`):
- Detecta por reglas: correos, teléfonos colombianos, cédulas y NIT, enlaces, códigos
  de contrato, personas por etiqueta de hablante o por tratamiento, y empresas por su
  forma jurídica.
- Mapa de sustituciones consistente: la misma persona siempre es `[PERSONA_1]`.
- Probado con una transcripción realista: **10 entidades detectadas**, alias estable en
  las 3 apariciones del mismo nombre, y el chequeo final de fugas da limpio.
- Panel de revisión: aceptar o rechazar entidad por entidad. Probado: al rechazar una,
  el contador pasa a "6 se ocultan · 1 se dejan" y el nombre reaparece en el texto.
- **Nada se envía al modelo sin pasar por esta revisión.** El botón de generar queda
  bloqueado con el aviso correspondiente.

**Motor de generación**:
- `api/generate.ts`: llama a Gemini con la key del servidor, verifica la sesión de
  Supabase, valida la entrada y traduce los errores. **Modo simulación** cuando no hay
  API key en desarrollo, para poder construir sin gastar cuota; en producción devuelve
  503 en vez de inventar.
- `api/_sesion.ts`: verificación del token contra Supabase.
- Puente en `vite.config.ts` que monta las funciones de `/api` en el servidor de
  desarrollo, que por sí solo no las conoce.
- `src/lib/generar.ts`: las seis llamadas en orden, con progreso, reintento por parte y
  métricas (requerimientos, palabras, duración, llamadas).
- `src/lib/markdown.tsx`: render a elementos de React, sin `innerHTML`. El texto viene
  de un modelo y no debe poder inyectar HTML.
- Probado de punta a punta en simulación: los 6 pasos avanzan, el documento se arma
  (465 palabras), se marca visiblemente como simulación y aparecen los botones de
  exportación.

### 2026-08-21 — Datos, historial y exportaciones

- `src/lib/datos.ts`: crear reunión, guardar documento con su prompt y métricas, extraer
  y guardar requerimientos, listar, buscar, borrar y leer métricas globales.
- Al terminar la generación se guarda sola la reunión (con la transcripción **ya
  anonimizada**), el documento y los requerimientos detectados. Sin sesión no falla:
  avisa que no se guardó.
- `src/lib/exportar.ts`: Markdown, Word y PDF.
  - **PDF con pdfmake**, con portada, pie con numeración y tablas reales. Probado en el
    navegador: PDF válido de 18 KB, nombre `R-01_Proyecto-ACCESO_2026-08-21_v3.pdf`.
  - Dos tropiezos resueltos: pdfmake 0.3 exporta las fuentes directamente (no dentro de
    `.vfs`) y sus métodos devuelven promesas en vez de aceptar callback. Con la API
    antigua el PDF se quedaba colgado sin dar error.
  - `pdfEnBase64` deja el archivo listo para la automatización a Drive de la etapa 7.
- `Reuniones.tsx`: listado real con búsqueda, estados de carga y error, y estado vacío.

**Sin probar todavía** (necesita una sesión iniciada): guardar en Supabase, el listado
con datos reales y el aislamiento entre usuarios.

### 2026-08-21 — Configuración de auth, segunda pasada y Drive

- **`supabase config push` aplicado** (autorizado por José): `enable_confirmations = false`,
  para poder registrarse sin esperar correo. De paso se corrigió `site_url`, que apuntaba
  a `127.0.0.1:3000`, un puerto que este proyecto no usa.
- **Seguridad por fila verificada contra la base real**: sin sesión, la lectura devuelve
  0 filas y la escritura se rechaza con
  `new row violates row-level security policy for table "reuniones"`.
- `api/anonimizar.ts`: segunda pasada semántica. Temperatura 0, y **descarta cualquier
  propuesta que no aparezca literalmente en el texto**, para que el modelo no invente
  entidades. Sin API key devuelve vacío en vez de fingir hallazgos.
- `api/drive.ts`: reenvía el archivo al webhook de Make o n8n con el secreto compartido,
  acepta respuesta JSON o texto plano, limita a 8 MB y registra el error si falla.
  Probado: sin webhook configurado avisa qué falta; sin datos, error de validación.
- Botón "buscar más con IA" en el panel de revisión, con su aviso de resultado.

### 2026-08-21 — Trazabilidad, comparación y métricas

- `src/lib/trazabilidad.ts`. **No se le pide al modelo que cite**: eso es justo lo que
  puede inventar. Se hace al revés — se busca en la transcripción la frase que más
  términos comparte con el requerimiento y se mide la coincidencia. Por eso la interfaz
  dice "coincidencia con la transcripción" y no "fuente citada".
- Probado con un documento que incluía dos requerimientos inventados a propósito:

  | Requerimiento | Coincidencia | Resultado |
  |---|---|---|
  | RF-01 validar marcaje contra turno | 57% | respaldado, con su cita |
  | RF-02 auditoría de apertura manual | 50% | respaldado, con su cita |
  | RF-03 integración con nómina (nadie lo dijo) | 0% | marcado sin respaldo |
  | RNF-01 disponibilidad 99.9% (inventado) | 0% | marcado sin respaldo |

- `Reunion.tsx`: detalle de la reunión con sus documentos, panel de trazabilidad con el
  porcentaje de respaldo y las citas, métricas del documento, el prompt exacto que se
  envió, exportación a los tres formatos, envío a Drive y borrado con confirmación.
- `Comparar.tsx`: las tres versiones en columnas, cada una con sus cifras (secciones, RF,
  RNF, palabras) para que la diferencia sea visible de un vistazo.
- `Metricas.tsx`: tarjetas y barras en escala sobria, con el aviso de que el tiempo
  ahorrado es una estimación declarada y no una medición instrumentada.

**Compilación de producción verificada.** El paquete inicial bajó de 2,38 MB a 507 kB:
pdfmake y sus fuentes (1,8 MB entre los dos) ahora se cargan solo cuando alguien exporta.

### 2026-08-21 — Identidad visual y responsive

- **Pantalla de acceso rediseñada.** La anterior era la plantilla de siempre: tarjeta
  centrada, cuadrito con iniciales, título, dos campos y botón ancho. Ahora es una
  pantalla partida: a la izquierda el producto demostrándose —una frase de la
  transcripción de la que sale un requerimiento numerado, unidos por un trazo, con su
  porcentaje de coincidencia— y a la derecha el formulario, callado. El panel va oscuro
  en los dos modos, con su propio tono y un borde para no fundirse con el lienzo.
- **Modo oscuro en grises neutros** (`#0a0a0b`, `#141416`, `#1c1c1f`), sin el tinte
  verdoso anterior.
- **Tipografía**: Instrument Sans para títulos, Inter para texto, IBM Plex Mono solo
  para datos (códigos, cifras, marcas de tiempo). Se eliminó el patrón de etiquetas en
  monoespaciada y mayúsculas repartido por 12 archivos, que era la causa real de que la
  interfaz pareciera un prototipo.
- **Responsive verificado a 375 px**: barra lateral convertida en cajón con menú
  hamburguesa (altura completa, se cierra al navegar y con Escape), los tres paneles de
  la pantalla de trabajo pasan a pestañas, la columna lateral del detalle se apila y la
  comparación pasa de tres columnas a una.
- Interruptor de tema también en la pantalla de acceso.
- `vercel.json` con reescrituras para que recargar en `/reuniones` no dé 404 en
  producción, más cabeceras de seguridad.
- **Salvavidas**: si una pantalla revienta, aparece un aviso con salida en vez de una
  página en blanco. Envuelve solo el área de contenido, así la navegación sobrevive.
- Modo demostración (`?demo=1`, solo en desarrollo) para poder revisar historial,
  comparación y métricas con contenido antes de tener datos reales.

### 2026-08-21 — Crítica de diseño y correcciones

Revisión de las pantallas con capturas, contra los principios de diseño de interfaz.
El diagnóstico fue que **sobraba**, no que faltara: cuatro de los siete hallazgos se
arreglaron borrando.

1. **Identidad triple.** Convivían `R1`, "R-01 / Requerimientos" y "Ancla / Asistente de
   levantamiento…" en 300 píxeles, y el acceso decía otra cosa. Ahora hay una sola marca,
   **Ancla**, y `R-01` sobrevive como código del proyecto en los documentos exportados.
2. **La barra superior no decía dónde estabas.** Repetía el nombre del producto en todas
   las pantallas. Ahora lleva el título de la sección, y en el detalle el nombre de la
   reunión con su proyecto (`src/lib/titulo.tsx`).
3. **Dos buscadores a 40 píxeles**, y el de arriba no hacía nada. Se eliminó.
4. **Metadatos de obra en el producto**: el pie de la barra lateral anunciaba la etapa de
   construcción, y encima desactualizada. Fuera.
5. **Estructura despareja**: unas pantallas con título propio y otras sin él. Ahora el
   título vive solo en la barra superior y ninguna pantalla lo repite — incluido el
   detalle, que lo duplicaba tras el cambio anterior.
6. **Umbrales mal calibrados**: los paneles solo se abrían a 1024 px. Ahora la
   transcripción convive con el segundo panel desde 768 px, y los tres desde 1280 px.
7. **La tesis desaparecía al entrar.** El anclaje era una pestaña escondida en el detalle.
   Ahora se ve al generar ("N de M anclados" en la cabecera del documento) y en el
   detalle, junto a los datos de la reunión. Verificado con los datos de muestra: marca
   3 de 5, dejando fuera los dos requerimientos que nadie mencionó.

### 2026-08-21 — Etapa 9: proyectos

- **Migración aplicada.** Tabla `proyectos` (nombre, cliente, dominio, plantilla,
  carpeta de Drive, activo), `reuniones.proyecto_id` con borrado suave, tres índices,
  disparador de `updated_at`, RLS con cuatro políticas.
- **Índice único por `(user_id, lower(nombre))`**: es lo que impide que dos tipeos
  creen dos proyectos, que era el problema de origen. El error de duplicado se traduce
  a un mensaje legible.
- La migración **convierte lo que ya existiera**: cada nombre escrito a mano pasa a ser
  un proyecto real y sus reuniones quedan enlazadas. La columna de texto se conserva
  como histórico.
- Pantalla de proyectos con alta, edición y borrado. Al borrar, las reuniones se
  conservan y quedan sin proyecto (no se pierde trabajo).
- En la pantalla de trabajo el proyecto pasó de campo de texto libre a **selector**, y
  al elegirlo se heredan su dominio y su documento de referencia.
- Filtro por proyecto en Reuniones y en Métricas.
- **Carpeta de Drive por proyecto**: el campo `carpeta` viaja en el webhook. Si el
  proyecto no la tiene configurada, la automatización usa la suya por defecto.

**Para el escenario de Make:** el webhook ahora recibe también `carpeta` y, dentro de
los metadatos, `cliente` y `fecha`. En el módulo de Google Drive hay que usar el valor
de `carpeta` como carpeta de destino en vez de una fija, con una carpeta de reserva por
si llega vacío.

### 2026-08-21 — Una llamada frente a seis: validación con datos

**Lo que se comprobó en la documentación de Google** (21/08/2026):

- Límite de salida de los Flash actuales: **65.536 tokens** por respuesta. Un documento
  de requerimientos completo ronda 3.000–5.000. El tope de 1.000 tokens que obligó al
  troceado era del entorno del artefacto, **no del modelo**.
- Los límites del nivel gratuito **ya no se publican** en la documentación: dependen de
  la cuenta y se consultan en `aistudio.google.com/rate-limit`. No se anotan cifras
  inventadas aquí.
- El catálogo actual es Gemini 3.6 Flash, 3.5 Flash, 3.5 Flash-Lite y 3.1 Flash-Lite.
  El `gemini-2.5-flash` que estaba puesto por defecto iba dos generaciones atrás.

**Medición con el constructor de prompts real**, transcripción de 1.485 palabras y
documento de referencia cargado:

| | Una llamada | Seis partes |
|---|---|---|
| Tokens de entrada | 3.548 | **21.738** |
| Peticiones | 1 | 6 |

El troceado multiplica la entrada **6,13 veces**, porque cada llamada reenvía el prompt
completo —transcripción y documento de referencia incluidos— para pedir una sección.

**Decisión:** una llamada por defecto, troceado como opción elegible en la pantalla. Se
guardan `modelo`, `modo` y `tokens_entrada_aprox` en cada documento, de modo que la
comparación entre esquemas quede respaldada con datos propios y no con una afirmación.

El anonimizado usa el modelo ligero (`gemini-3.5-flash-lite`): es extracción, no
redacción, y gasta menos cuota.

---

### 2026-08-22 — Drive conectado y carpeta por proyecto

**La subida a Drive ya funciona.** El fallo que llevaba días (`[404] Folder not found:
{{2.carpeta}}`) no estaba en el código sino en el escenario de Make: en el campo
*Folder ID* del módulo de Drive, `2.carpeta` estaba escrito como **texto plano** y no
como variable mapeada, así que Make enviaba a Google la cadena literal `{{2.carpeta}}`.
Se arregló vaciando el campo y eligiendo `carpeta` desde el panel de mapeo, que lo
inserta como ficha. Comprobado: `prueba-ancla.txt` llegó a Drive con sus 72 bytes
exactos, es decir que el binario viaja íntegro por `multipart/form-data`.

**Carpeta por proyecto.** Se añadió un segundo escenario en Make,
*Ancla R-01 - Carpeta de proyecto* (id 6020186): webhook → Google Drive *Create a
Folder* (`New Folder Location` = `2.padre`, `New Folder's Name` = `2.nombre`) →
respuesta `{"id": …, "url": …}`. Son dos escenarios y no uno con bifurcación para que
cada uno haga una sola cosa: si archivar falla, el alta de proyectos no se cae.

Del lado de la aplicación:

| Archivo | Qué hace |
| --- | --- |
| `api/carpeta.ts` | Pide la carpeta a la automatización y devuelve su id. Exige sesión, igual que el resto de `/api`. |
| `src/lib/drive.ts` | Puente desde el navegador; añade el token de Supabase. |
| `src/routes/Proyectos.tsx` | Al crear un proyecto sin carpeta escrita a mano, la pide y guarda el id. Si falla, el proyecto se crea igual y avisa. |

Quien decide si hace falta crear la carpeta es la aplicación, mirando si el proyecto ya
tiene `carpeta_drive`. Esa es la única defensa contra carpetas repetidas: Drive admite
dos carpetas con el mismo nombre y no deduplica.

**Comprobado de punta a punta:** se creó `Proyecto ACCESO` dentro de `Ancla R-01` y se
subió un archivo dentro de esa subcarpeta. Quedan en Drive `prueba-ancla.txt` y la
carpeta `Proyecto ACCESO` como restos de prueba; se pueden borrar.

Variable nueva en `.env.local`: `AUTOMATION_CARPETA_WEBHOOK_URL`.

---

### 2026-08-22 — Repositorio en GitHub y despliegue en Vercel

**GitHub.** El código vive en `jmsb8888/ancla-aplication` (privado), rama `main`.
Quedaron fuera del control de versiones `.env.local`, `supabase/.temp/` (estado local
de la CLI) y `tsconfig.tsbuildinfo`.

**Identidad de los commits.** El repo tiene su propia configuración de autor:

```
git config user.email "80297741+jmsb8888@users.noreply.github.com"
```

No es un capricho. El plan Hobby de Vercel **rechaza** los despliegues cuyo commit
venga de alguien que no sea el dueño de la cuenta, y la identidad global de esta
máquina es `jsalamanca@automatiza.co`, que GitHub resuelve a otra cuenta. Con la
global, el push se sube pero el despliegue queda en *Blocked*. La configuración es
local a este repositorio: la global sigue intacta.

**Vercel.** Proyecto `ancla-aplication` en «Jose's projects», preset Vite detectado
solo, y despliegue automático desde `main`. Dominio de producción:
**https://ancla-aplication.vercel.app**

Para que Vercel viera el repositorio privado hubo que instalar su app de GitHub en la
cuenta `jmsb8888`, limitada a ese único repositorio.

**Un fallo que solo aparece en producción.** Todas las funciones de `/api` respondían
500 con `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/api/_sesion'`. El paquete
declara `"type": "module"`, así que en producción las ejecuta Node como ESM y Node
**exige la extensión** en los imports relativos; en local Vite resuelve el especificador
y por eso no se notaba. Los imports pasaron a `from "./_sesion.js"`, que TypeScript
sigue resolviendo al `.ts`. Vale la pena recordarlo: lo que funciona en `npm run dev`
no prueba que las funciones de servidor funcionen.

**Variables de entorno cargadas en Vercel** (Production y Preview): `GEMINI_MODEL`,
`GEMINI_MODEL_LIGERO`, `AUTOMATION_WEBHOOK_URL`, `AUTOMATION_CARPETA_WEBHOOK_URL`,
`DRIVE_CARPETA_POR_DEFECTO`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Faltan **`GEMINI_API_KEY`** y **`AUTOMATION_SECRET`**, que las pega José en
*Settings → Environment Variables* y luego redespliega. Sin ellas el generador corre en
simulación y el archivado a Drive no sale. Los valores están en su `.env.local`.

---

### 2026-08-22 — Prueba con una transcripción real: tres fallos y sus arreglos

Hasta aquí el motor se había verificado con datos fabricados por mí, que se
parecían demasiado a lo que el código esperaba. Con una transcripción real de
levantamiento (58 min, 1.190 palabras, con desacuerdo entre dos participantes y
cifras corregidas a mitad de frase) salieron tres fallos que las pruebas
anteriores no podían ver.

**1. El documento salía cortado a mitad de frase.** `maxOutputTokens` estaba en
4.096, y ese presupuesto cubre también el razonamiento del modelo: en la medición
se fueron **3.933 tokens en razonar y quedaron 159 para el documento**, con
`finishReason: MAX_TOKENS`. Subido a 32.768 el documento sale completo (7.933
caracteres, `finishReason: STOP`). Además la respuesta ahora viaja con
`truncado`, y la interfaz marca «cortado»: antes un documento truncado se
devolvía como si estuviera terminado.

**2. La transcripción «anonimizada» conservaba los nombres.** El regex de
hablante exigía `[A-Z][a-z]+`, así que `MARCELA:` en mayúsculas —como escriben
casi todos los transcriptores— no se detectaba, y `aplicar` reemplazaba sin
ignorar mayúsculas. Resultado: **59 apariciones de los tres nombres seguían en el
texto** y `quedaAlgoSinRevisar` devolvía `false`, o sea que la aplicación
aseguraba que estaba limpio. Se arregló el regex, se hicieron las búsquedas y la
deduplicación insensibles a mayúsculas, y el chequeo de seguridad ahora también
mira si sobrevivió alguna etiqueta de hablante con pinta de nombre. Verificado:
71 apariciones sustituidas, cero fugas.

De paso apareció que los cargos genéricos —«gerente de planta», «jefe de
seguridad»— se convertían en `[PERSONA_n]`, lo que no protege a nadie y le quita
contexto al documento. Ahora existe el tipo `cargo`, se propone pero **no se
acepta solo**: lo decide el analista.

**3. La trazabilidad marcaba 0 % sobre un documento correcto.** Comparaba cada
requerimiento contra una sola frase, pero un requerimiento redactado en formal se
apoya en varias frases seguidas del diálogo. Se pasó a una ventana de tres frases
contiguas y se recalibró el umbral con medición, no a ojo:

| | puntaje |
| --- | --- |
| 9 requerimientos legítimos del documento | 21 % – 38 % |
| 5 requerimientos inventados a propósito | 0 % – 14 % |

El umbral bajó de 0,34 a **0,20**, en medio de las dos franjas. Resultado: 9/9
respaldados y 0/5 inventados colados. La calibración es sobre una sola reunión;
si con más transcripciones aparecen inventados por encima del 20 %, hay que
subirlo.

**Lo que sí funcionó a la primera:** el prompt de la versión 3 (4/4 capas), la
generación con el modelo real, y el documento resultante, que recoge el
desacuerdo entre los dos participantes como conflicto abierto, la cifra corregida
(62 → ~30) y la pregunta de quién autoriza en el turno nocturno.

**Probado también en producción:** con sesión iniciada se creó el proyecto
*Proyecto ACCESO*, su carpeta se creó sola en Drive y el id quedó guardado en
Supabase (`carpeta_drive`). Eso cierra el circuito aplicación desplegada →
Make → Drive → base de datos.

---

### 2026-08-22 — Prueba en el navegador: tres fallos que solo se ven ahí

La prueba anterior corrió el motor desde Node y dio por bueno el resultado.
Ejercitar la aplicación **en Chrome, contra producción y con sesión real**, sacó
tres cosas que aquella no podía ver porque nunca renderizó nada.

**1. La pestaña se congelaba al recibir el documento.** El servidor respondía
`200` —consta en los logs de Vercel— pero el navegador se quedaba bloqueado: sin
error en consola, sin JavaScript ejecutable, sin guardar nada. La causa estaba en
`renderMarkdown`: las ramas de encabezado y listas exigen un espacio tras el
marcador («`- item`», «`1. item`»), pero la condición del bucle de párrafo los
excluye **sin** exigirlo. Una línea como `**Proyecto:** ACCESO` no la reclamaba
ninguna rama y tampoco entraba en la del párrafo, así que `i` no avanzaba y el
bucle exterior giraba para siempre. Todos los documentos generados abren con esa
forma, o sea que fallaban todos. El párrafo ahora consume siempre su primera
línea. Verificado con siete casos límite y el documento real: 41 nodos en 7 ms.

Se auditaron los demás bucles del proyecto: los dos exportadores de
`exportar.ts` sí avanzan siempre. El hueco era único de `markdown.tsx`.

**2. La cita del requerimiento no se guardaba.** `guardarRequerimientos` volvía a
parsear el markdown por su cuenta y nunca escribía `cita_origen` ni
`cita_offset`, aunque las columnas existen desde la primera migración y la
trazabilidad ya estaba calculada para pintarla en pantalla. Al reabrir la
reunión, el respaldo había desaparecido. Ahora la extracción pasa por
`verificarDocumento` —había dos parsers para lo mismo— y la cita se persiste,
solo cuando supera el umbral.

**3. El PDF no se generaba.** `File 'Roboto-Regular.ttf' not found in virtual
file system`. El código registraba las fuentes con `pdfMake.vfs = …`, que es la
API de pdfmake 0.2; la 0.3 —la instalada, 0.3.11— la ignora en silencio y espera
`addVirtualFileSystem`. Bloqueaba el botón de PDF y también el envío a Drive,
que construye el PDF antes de mandarlo.

**Recorrido completo verificado en producción**, con sesión iniciada:

| Paso | Resultado |
| --- | --- |
| Proyecto → carpeta en Drive | creada sola, id en `proyectos.carpeta_drive` |
| Transcripción → anonimizado | 4 entidades, 71 apariciones, 0 fugas |
| Prompt v3 | 4/4 capas, 9.950 caracteres |
| Generación | 1 llamada, 40 s, `finishReason: STOP` |
| Guardado | reunión + documento (8.372 car.) + 6 requerimientos |
| Trazabilidad | 100 %, 6 de 6 con cita textual |

---

### 2026-08-22 — Abrir el PDF: tres fallos de maquetación

El PDF llegó a Drive, pesaba 45 KB y Drive lo reconocía. Nada de eso dice que esté
bien maquetado, y no lo estaba. José lo abrió y avisó.

| Qué pasaba | Por qué |
| --- | --- |
| Todo el texto plano, sin negritas | `limpiar()` borraba los `**` en vez de aplicarlos. El exportador de Word sí lo hacía bien; era solo el de PDF. |
| «Descripción» partida cada cuatro palabras | `widths: cab.map(() => "*")`: todas las columnas iguales, así que la de las frases largas medía lo mismo que «Prioridad». |
| `---` impresos como texto | Ningún renderizador —pantalla, Word ni PDF— contemplaba la regla horizontal, así que caía en la rama de párrafo. |

Los anchos ahora son proporcionales al contenido con amortiguación por raíz
cuadrada: sin ella una descripción larga se comería la tabla entera. La tabla de
requerimientos queda `2* · 9* · 2* · 3*`.

Verificado sobre el documento real antes de subir: 11 reglas y ningún `---`
suelto en los tres formatos, 65 trozos en negrita en el PDF, 49 `<b>` en Word.

**La lección, otra vez la misma:** que un artefacto exista y pese lo razonable no
dice nada de su contenido. Los tres fallos anteriores de esta jornada —la pestaña
colgada, la cita perdida, la fuente de pdfmake— también pasaron una comprobación
indirecta antes de que alguien mirara el resultado de verdad.

---

## Cómo retomar si se pierde la sesión

1. Lee este archivo y `PROMPT.md` (el encargo completo).
2. Mira la tabla de etapas: la que esté en 🔨 o la primera ⏳ es la que sigue.
3. Revisa "Lo que necesito de José": si hay algo sin marcar, esa etapa está bloqueada.
4. Para levantar el proyecto:

```bash
cd "C:\Users\Usuario\Downloads\ESPECIALIZACION\DIPLOMADO\dos\app-r01" && npm install && npm run dev
```
