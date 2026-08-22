# Prompt de construcción — R-01 · Asistente de Levantamiento de Requerimientos

> Este archivo es el prompt que se le entrega a un agente de desarrollo (Claude Code,
> Google AI Studio, Cursor o equivalente) para construir la aplicación. Está escrito
> para ser copiado y pegado completo.

---

## 0. Rol y encargo

Actúa como desarrollador full-stack senior con criterio de producto y de diseño.
Vas a construir una aplicación web completa, desplegable en Vercel, a partir de un
prototipo HTML existente que ya funciona pero que vive dentro de un entorno cerrado.

Trabaja por etapas, muéstrame el resultado de cada una y espera confirmación antes de
seguir con la siguiente. No avances a la etapa siguiente si la anterior no corre.

Usa las habilidades y herramientas de desarrollo que tengas disponibles: si dispones de
una skill de diseño de interfaces, cárgala antes de la etapa de UI; si puedes levantar
un servidor de previsualización y ver la aplicación en un navegador, hazlo para
verificar cada pantalla en vez de asumir que funciona; si puedes leer los errores de
consola y de red, revísalos antes de darme por terminada una etapa.

---

## 1. Contexto del proyecto

El levantamiento de requerimientos de software se hace hoy en reuniones que se graban y
se transcriben automáticamente. Esa transcripción es fiel pero inservible como documento:
mezcla decisiones con ruido, no distingue lo acordado de lo aplazado, y convertirla a
mano en un documento de requerimientos toma alrededor de tres horas por reunión.

Existe un prototipo que resuelve la conversión con un modelo generativo y un prompt
cuidadosamente diseñado. El prototipo funciona, pero:

- vive dentro de un entorno cerrado del que no se puede sacar,
- no guarda nada: al cerrar la ventana se pierde todo,
- la anonimización de la transcripción se hace a mano antes de pegarla,
- no permite fijar los parámetros de generación (temperatura, muestreo),
- tiene un tope de 1000 tokens por respuesta que obligó a partir el documento en seis
  llamadas encadenadas.

El encargo es convertirlo en una aplicación real que resuelva esos cinco puntos.

**El prototipo original está en `artefacto.txt`** (un único archivo HTML autocontenido,
1396 líneas). Léelo completo antes de escribir código: contiene la lógica de prompts,
que es el activo central del proyecto y **se conserva sin cambios de contenido**.

---

## 2. Lo que se conserva intacto

La construcción del prompt es el corazón del sistema y está validada. Se migra tal cual,
palabra por palabra. Copia los textos desde `artefacto.txt`, no los reescribas ni los
"mejores".

### 2.1 Las tres versiones del prompt

El usuario elige con qué nivel de especificidad ejecutar. La progresión es deliberada:
cada versión agrega una capa y el sistema muestra cuántas capas hay activas sobre cuatro
(instrucción, rol, restricciones, ejemplo de formato).

| Bloque | v1 | v2 | v3 |
|---|:--:|:--:|:--:|
| Instrucción base | ✓ | ✓ | ✓ |
| Rol del analista + dominio | | ✓ | ✓ |
| Tarea + lista de secciones exigidas | | ✓ | ✓ |
| Restricciones (las nueve reglas) | | ✓ | ✓ |
| Documento de referencia como ejemplo de formato | | | ✓ |
| Instrucción de entrega | | ✓ | ✓ |
| Transcripción | ✓ | ✓ | ✓ |

**v1** es literalmente una línea más la transcripción:

```
Convierte esta transcripción de reunión en un documento de requerimientos.

[transcripción]
```

Cuando el usuario elige v1, los controles de configuración se deshabilitan visualmente:
esa versión no los usa, y hacerlo visible es parte del propósito didáctico de la
herramienta. En v3 el documento de referencia es obligatorio.

### 2.2 Las nueve restricciones

Van literales, en el bloque de restricciones de v2 y v3:

- No incluyas ningún requerimiento que no esté mencionado o directamente implícito en la transcripción.
- Si un tema quedó ambiguo, sin cerrar o aplazado, no lo conviertas en requerimiento: llévalo a la sección de preguntas abiertas.
- No declares como acordado ningún punto en el que las partes no llegaron a un acuerdo explícito.
- Si alguien reportó lo que desea un tercero que no participó en la reunión, no lo conviertas en requerimiento.
- No propongas cronogramas, fases ni duraciones.
- No inventes valores numéricos de retención, disponibilidad, tiempos de respuesta ni normativa que no se hayan mencionado.
- Cada requerimiento debe ir en una sola frase, redactado como "El sistema debe...".
- No uses cifras que el cliente no haya dado; si dio una cifra aproximada o la corrigió durante la reunión, consérvala como aproximada.
- Extensión máxima y tono, según la configuración elegida.

### 2.3 El troceado en seis partes

La generación no se resuelve en una llamada. El prompt base se envía seis veces, cada
una con una instrucción de cierre distinta, y los resultados se concatenan en orden:

1. Encabezado de metadatos, control de versiones, propósito y alcance con su contexto, y fuera de alcance
2. Únicamente el glosario
3. Únicamente los requerimientos funcionales, completos y con todas sus columnas
4. Únicamente los requerimientos no funcionales y los supuestos
5. Únicamente los conflictos y decisiones pendientes, y las preguntas abiertas
6. Únicamente la trazabilidad y la nota de cierre

A cada parte se le añade: *"No repitas otras secciones, no incluyas preámbulo ni
comentarios finales. Continúa la numeración de secciones donde corresponda."*

**Conserva el troceado** aunque el nuevo modelo permita respuestas más largas: produce
documentos más completos y da una barra de progreso honesta. Hazlo configurable
(documento en seis partes / en una sola llamada) para poder comparar ambos modos y
documentar el resultado.

---

## 3. Arquitectura y stack

```
Navegador (React + Vite)
   ├── habla directo con Supabase  → datos, sesión, archivos
   └── habla con /api (Vercel)     → todo lo que necesite la API key de Google
                                        └── Gemini
                                        └── webhook de automatización → Google Drive
```

**Stack obligatorio:**

- React 18 + TypeScript + Vite
- Tailwind CSS para estilos (con los tokens de diseño de la sección 8)
- React Router para navegación
- TanStack Query para datos remotos
- `@supabase/supabase-js` para datos y sesión
- `pdfmake` para generar el PDF en el navegador (texto seleccionable, tablas reales; no uses captura de pantalla)
- Funciones serverless en la carpeta `/api` (formato de Vercel Functions, runtime Node)

**Regla dura:** la API key de Google **nunca** llega al navegador. Cualquier llamada al
modelo pasa por `/api`. Si en algún momento necesitas la key en el cliente, es que el
diseño está mal.

---

## 4. Modelo de datos (Supabase / PostgreSQL)

Genera el SQL completo, listo para pegar en el editor SQL de Supabase, incluyendo las
políticas de seguridad por fila. Toda tabla lleva `user_id` y toda política filtra por
`auth.uid()`.

```
profiles          id (= auth.users.id), nombre, organizacion, created_at

reuniones         id, user_id, titulo, proyecto, dominio, fecha_reunion,
                  transcripcion_anonimizada (text), tiene_original (bool),
                  n_palabras, created_at

documentos        id, reunion_id, user_id, version_prompt (1|2|3),
                  config (jsonb: proyecto, dominio, secciones, detalle, tono,
                          modelo, temperatura, top_p, modo_troceado),
                  prompt_enviado (text), contenido_md (text),
                  metricas (jsonb: n_palabras, n_rf, n_rnf, n_supuestos,
                            n_preguntas_abiertas, n_conflictos,
                            duracion_ms, llamadas, tokens_estimados),
                  created_at

requerimientos    id, documento_id, user_id, codigo (RF-01), tipo (RF|RNF),
                  texto, prioridad, criterio_aceptacion,
                  cita_origen (text), cita_offset (int)   ← trazabilidad

plantillas        id, user_id, nombre, contenido (text), created_at
                  ← documentos de referencia reutilizables para v3

exportaciones     id, documento_id, user_id, formato (pdf|docx|md),
                  destino (descarga|drive), url_externa, estado, error,
                  created_at
```

**Decisiones sobre datos que debes respetar:**

- Se guarda **la transcripción anonimizada**, nunca la original. `tiene_original` solo
  registra que existió, para trazabilidad.
- El mapa de sustituciones de la anonimización **no se persiste**. Vive en memoria
  durante la sesión y se descarta.
- `prompt_enviado` se guarda completo: es la evidencia de qué se le pidió al modelo y
  hace auditable cada documento.

---

## 5. Autenticación

Supabase Auth con correo y contraseña. Pantalla de registro e inicio de sesión, ruta
protegida para todo lo demás, cierre de sesión visible.

Activa RLS en todas las tablas desde el primer día, no al final. Incluye en el SQL una
política por operación (select, insert, update, delete) para cada tabla.

---

## 6. Funcionalidades

Cada una con sus criterios de aceptación. No des una por terminada sin cumplirlos.

### F1 · Generación del documento

Pantalla de trabajo con cuatro zonas, heredadas del prototipo:

- **A · Entrada.** Selector de versión (v1/v2/v3) con indicador de capas activas sobre
  cuatro. Campo de transcripción. Campo de documento de referencia, visible solo en v3.
- **B · Configuración.** Proyecto, dominio del analista, secciones exigidas (casillas),
  límite de salida, tono. Se deshabilita en v1. **Nuevo:** modelo, temperatura y top-p.
- **C · Prompt generado.** El prompt completo, en vivo, actualizado con cada cambio,
  resaltando los bloques que la versión elegida añade respecto de la anterior.
  Contadores: palabras de la transcripción, caracteres del prompt, capas activas.
- **D · Documento.** El resultado con su formato aplicado.

*Criterios:* el prompt de C es idéntico al que se envía; la barra de progreso indica
"parte N de 6"; si una parte falla, el documento conserva las anteriores y ofrece
reintentar solo la fallida; al terminar, todo queda guardado en `documentos`.

### F2 · Anonimizador automático

Hoy el usuario anonimiza a mano. La aplicación lo hace sola, en dos pasadas:

1. **Determinista (regex, en el navegador):** correos, teléfonos, cédulas y NIT, URLs,
   números de contrato o de orden.
2. **Semántica (modelo, vía `/api`):** nombres de personas, nombres de empresa y cargos
   que identifiquen. Devuelve una lista de sustituciones propuestas.

Ambas alimentan un **mapa de sustituciones consistente**: la misma persona es siempre
`[PERSONA_1]`, el mismo cliente siempre `[CLIENTE_1]`.

La pantalla muestra el texto con las sustituciones resaltadas y un panel lateral donde el
usuario puede aceptar, rechazar o editar cada una antes de continuar. Nada se envía al
modelo generador hasta que el usuario confirma.

*Criterios:* ninguna transcripción llega a `/api/generate` sin pasar por la confirmación;
el mapa no se guarda en base de datos; el contador muestra cuántas entidades se
sustituyeron y de qué tipo.

### F3 · Historial y acceso a los documentos generados

Listado de reuniones con su fecha, proyecto y número de documentos. Al entrar a una
reunión, sus documentos con la versión de prompt usada y las métricas.

Cada documento se puede abrir, leer completo, descargar en PDF, Word o Markdown, copiar
al portapapeles, enviar a Drive y borrar. Búsqueda por texto sobre título, proyecto y
contenido. Filtros por versión de prompt y por rango de fechas.

*Criterios:* recargar la página no pierde nada; un usuario nunca ve documentos de otro
(verifícalo con dos cuentas); borrar pide confirmación y es en cascada.

### F4 · Comparación de versiones

Sobre una misma reunión, ejecutar v1, v2 y v3 y verlas en tres columnas sincronizadas por
scroll, con las diferencias de estructura señaladas: qué secciones aparecen en cada una,
cuántos requerimientos produjo cada una, cuántas preguntas abiertas.

Es la demostración visual de la tesis del proyecto: la calidad del resultado depende del
diseño del prompt, no del modelo. Cuídala, es la pantalla que se muestra en la
sustentación.

### F5 · Tablero de métricas

Sobre el histórico del usuario:

- Documentos generados y reuniones procesadas
- Promedio de requerimientos funcionales y no funcionales por reunión
- Preguntas abiertas por reunión — indicador de ambigüedad del levantamiento
- Distribución de uso por versión de prompt
- Tiempo de generación promedio y tiempo estimado ahorrado (3 h de referencia por
  documento manual, menos el tiempo real de la sesión)
- Evolución en el tiempo

Gráficas sobrias, coherentes con el diseño. Si el histórico está vacío, un estado vacío
que explique qué aparecerá aquí, no una gráfica en cero.

### F6 · Trazabilidad a la fuente

Al generar, se pide al modelo que cada requerimiento incluya la frase de la transcripción
que lo originó. Se guarda en `requerimientos.cita_origen`.

En la vista del documento, al pasar el cursor sobre un requerimiento se muestra su cita;
al hacer clic, se salta a esa posición en la transcripción, resaltada. Un requerimiento
sin cita se marca con una advertencia: es un candidato a alucinación y el usuario debe
revisarlo.

*Criterios:* el porcentaje de requerimientos con cita verificable se muestra como
indicador de confianza del documento.

### F7 · Exportación y envío a Drive

Exportar a PDF (`pdfmake`, con portada, encabezados, tablas y numeración), a Word y a
Markdown.

**Envío a Drive por automatización.** La aplicación no habla con Google Drive: envía el
archivo a un webhook de una plataforma de automatización (Make o n8n), que es quien lo
deposita en la carpeta del proyecto. Contrato del webhook:

```
POST  {URL del webhook}
Headers: X-Webhook-Secret: {secreto compartido}
Body (JSON):
{
  "proyecto":    "Proyecto ACCESO",
  "reunion":     "Levantamiento control de acceso",
  "fecha":       "2026-08-21",
  "version":     3,
  "nombre":      "R-01_ACCESO_2026-08-21_v3.pdf",
  "mime":        "application/pdf",
  "contenido":   "<base64 del archivo>",
  "metricas":    { "rf": 12, "rnf": 5, "preguntas_abiertas": 3 }
}

Respuesta esperada: { "url": "https://drive.google.com/..." }
```

La llamada al webhook sale desde `/api/drive`, no desde el navegador, para no exponer el
secreto. La URL devuelta se guarda en `exportaciones.url_externa` y se muestra como
enlace en el historial.

*Criterios:* si el webhook falla, la exportación queda registrada con estado de error y
el usuario puede reintentar; la descarga local nunca depende del webhook.

---

## 7. Endpoints de `/api`

```
POST /api/generate
  body:  { prompt, modelo, temperatura, topP, maxTokens }
  hace:  llama a Gemini con la key del servidor
  devuelve: { texto, tokensEntrada, tokensSalida, duracionMs }

POST /api/anonimizar
  body:  { texto }
  hace:  pide al modelo las entidades identificables
  devuelve: { sustituciones: [{ original, reemplazo, tipo, offset }] }

POST /api/drive
  body:  { nombre, mime, contenido, metadatos }
  hace:  reenvía al webhook de automatización con el secreto
  devuelve: { url }
```

Todos verifican la sesión de Supabase antes de ejecutar: un endpoint abierto que llame al
modelo con tu key es una factura esperando a pasar. Aplica además un límite de llamadas
por usuario y por minuto.

**Variables de entorno** (documenta un `.env.example` y no subas valores reales):

```
GEMINI_API_KEY          key de Google AI Studio        (solo servidor)
GEMINI_MODEL            modelo por defecto             (solo servidor)
AUTOMATION_WEBHOOK_URL  webhook de Make o n8n          (solo servidor)
AUTOMATION_SECRET       secreto compartido             (solo servidor)
VITE_SUPABASE_URL       URL del proyecto Supabase      (público)
VITE_SUPABASE_ANON_KEY  clave anónima de Supabase      (público)
```

---

## 8. Diseño de interfaz

**Del prototipo se hereda la lógica, no el aspecto.** Ignora por completo su paleta, su
tipografía y su estética de formato en papel. El diseño visual se hace de cero.

Esto no es decoración: la herramienta se sustenta en vivo frente a un jurado y la
primera impresión la da la pantalla. Trátalo como una entrega de diseño, no como un
"ponle estilos al final".

### 8.1 Concepto: estación de trabajo, no tablero de control

Quien usa esto es un analista que pasa una hora peleando con un texto largo. La interfaz
tiene que desaparecer y dejar que el contenido mande. Nada de bienvenidas, tarjetas
decorativas, degradados de moda ni ilustraciones de stock.

Tres principios que gobiernan cada decisión:

1. **El texto es el protagonista.** Transcripción, prompt y documento son los tres
   objetos reales del sistema. Todo lo demás es andamiaje y debe ocupar menos espacio,
   menos contraste y menos color que ellos.
2. **Densidad con aire.** Es una herramienta profesional: cabe mucha información en
   pantalla, pero con respiración suficiente para leer sin fatiga. Ni un panel de
   administración apretado ni una landing con media pantalla vacía.
3. **El estado siempre visible.** En todo momento debe saberse qué versión está activa,
   qué se va a enviar al modelo, en qué parte va la generación y qué se guardó.

### 8.2 Lenguaje visual

**Base neutra, un solo acento.** Fondo gris muy claro y superficies blancas en modo
claro; grises profundos en modo oscuro. Un único color de acento para acciones
primarias, foco y elementos activos. Los demás colores solo comunican estado: éxito,
advertencia, error, y un tono aparte para "sin verificar".

Elige un acento sobrio y con personalidad —un azul profundo, un verde petróleo o un
índigo— y úsalo poco: si el acento aparece en todas partes, deja de señalar nada.

**Modo oscuro desde el principio**, no como añadido. Ambos modos con la misma jerarquía
y el mismo contraste percibido. El oscuro se ve especialmente bien en la grabación del
video.

**Tipografía con escala real.** Una sans de interfaz de buena legibilidad en tamaños
pequeños (Inter, Geist o similar) y una monoespaciada para prompt, códigos de
requerimiento, métricas y cualquier valor técnico (JetBrains Mono, IBM Plex Mono o
similar). Define una escala de tamaños y respétala; no inventes tamaños intermedios
sobre la marcha. El cuerpo de los textos largos nunca baja de 15 px y su medida de
línea se limita a unos 75 caracteres.

**Superficies planas.** Bordes de 1 px, radios pequeños y consistentes, sombra
únicamente en lo que flota de verdad (menús, modales, notificaciones). La jerarquía se
construye con espaciado, peso tipográfico y líneas divisorias, no con cajas de colores.

**Rejilla de 8 px** para todo el espaciado. Sin excepciones.

**Movimiento funcional.** Transiciones de 120 a 180 ms, solo donde explican algo: un
bloque de prompt que aparece, un paso que se completa, un panel que se abre. Nada
rebota, nada gira sin motivo, y todo se desactiva si el sistema pide movimiento
reducido.

### 8.3 Estructura de pantalla

- **Barra lateral izquierda** angosta y permanente: Reuniones · Nueva · Comparar ·
  Métricas · Plantillas. Iconos con etiqueta, no iconos sueltos que haya que adivinar.
- **Barra superior** con el proyecto activo, la búsqueda global y la sesión.
- **Área de trabajo** de ancho amplio (hasta 1440 px) porque aquí se comparan textos.

La pantalla de generación es un **espacio de tres paneles redimensionables**:
transcripción a la izquierda, configuración y prompt en vivo al centro, documento
resultante a la derecha. El usuario arrastra los divisores y la aplicación recuerda sus
anchos. En pantallas menores los paneles se vuelven pestañas antes que apilarse en una
columna infinita.

Mantén los cuatro grupos funcionales del prototipo (entrada, configuración, prompt,
documento) como agrupación lógica, pero resuélvelos con la disposición de paneles, no
con las secciones rotuladas del original.

### 8.4 Piezas que hay que resolver especialmente bien

- **El prompt en vivo.** Es lo que hace singular a esta herramienta. Monoespaciado, con
  cada bloque como una unidad identificable, y los bloques que aporta la versión activa
  marcados con una barra lateral de acento y una etiqueta discreta ("rol",
  "restricciones", "ejemplo"). Al cambiar de versión, el bloque que entra se anima
  brevemente. Contadores de palabras, caracteres y capas activas en la misma zona,
  siempre a la vista.
- **El progreso de generación.** Seis pasos numerados con nombre propio y estado
  individual, y el documento escribiéndose parte por parte a medida que llega. Nunca un
  spinner solo. Anúncialo con `aria-live` para lectores de pantalla.
- **El anonimizador.** Las entidades detectadas se marcan sobre el texto con un
  subrayado en color de advertencia y su tipo en mono, pequeño, encima. Panel lateral
  con la lista, recorrible con teclado, y acciones de aceptar, rechazar o editar por
  entidad y en bloque. Un contador claro de cuántas quedan sin revisar y un botón de
  continuar que permanece bloqueado hasta que no haya pendientes.
- **La comparación de versiones.** Tres columnas con scroll sincronizado y una franja
  superior por columna con sus cifras. Las diferencias de estructura se señalan al
  margen. Es la pantalla que demuestra la tesis del proyecto: cuídala más que ninguna.
- **La trazabilidad.** El requerimiento con cita se puede desplegar para ver la frase
  original; el que no la tiene lleva una marca de advertencia visible, no un detalle
  escondido. En la cabecera del documento, el porcentaje de requerimientos verificables
  como indicador de confianza.
- **Las métricas.** Gráficas en escala de grises con el acento reservado a la serie
  principal. Sin leyendas de arcoíris, sin tortas de doce colores. Cada gráfica responde
  a una pregunta que se enuncia en su título.

### 8.5 Comportamiento

- **Estados vacíos, de carga y de error escritos de verdad**, uno por uno. El vacío
  explica qué aparecerá ahí y ofrece la acción para empezar. El error dice qué pasó y
  qué se puede hacer.
- **Nada se pierde.** Borrador de la transcripción guardado localmente mientras se
  escribe; si el navegador se cierra, al volver está ahí.
- **Confirmación solo para lo destructivo**, y con posibilidad de deshacer cuando se
  pueda.
- **Atajos de teclado** para lo frecuente: generar, copiar el prompt, cambiar de versión,
  buscar. Visibles en una ayuda accesible con `?`.
- **Accesibilidad real:** contraste AA en ambos modos, foco visible siempre, navegación
  completa por teclado, campos con etiqueta asociada, y ningún estado comunicado solo
  por color.

## 9. Seguridad y privacidad

Es un requisito del dominio, no una formalidad: se procesan transcripciones con datos de
clientes reales.

- La key de Google solo existe en variables de entorno del servidor.
- Todos los endpoints exigen sesión válida y tienen límite de uso por usuario.
- RLS activo en todas las tablas, verificado con dos cuentas distintas.
- No se persiste la transcripción original ni el mapa de anonimización.
- El aviso de anonimización aparece en el punto de la acción, no en un pie de página.
- El secreto del webhook viaja solo desde el servidor.
- Nada de credenciales en el repositorio: `.env.example` con nombres, nunca con valores.

---

## 10. Etapas de entrega

1. **Base.** Proyecto Vite + React + TS + Tailwind con los tokens de diseño, rutas y
   layout. Corriendo en local y desplegado en Vercel, aunque esté vacío.
2. **Datos y sesión.** SQL de Supabase con RLS, registro, inicio de sesión, ruta
   protegida. Verificado con dos cuentas.
3. **Motor.** Constructor de prompts migrado literal del prototipo, `/api/generate`,
   generación en seis partes con progreso, guardado en `documentos`.
4. **Historial.** Listado, detalle, búsqueda, filtros, exportación a PDF, Word y Markdown.
5. **Anonimizador.** Las dos pasadas, el panel de revisión y el bloqueo previo al envío.
6. **Trazabilidad, comparación y métricas.**
7. **Automatización a Drive** por webhook, con registro de exportaciones y reintento.
8. **Pulido de interfaz** con la skill de diseño: revisión pantalla por pantalla en el
   navegador, estados vacíos, foco, contraste, responsive.

Al terminar cada etapa: qué construiste, cómo lo verificaste, qué quedó pendiente.

*(Opcional — bórralo si no quieres pruebas: escribe pruebas unitarias para las dos
funciones puras críticas, el constructor de prompts y el anonimizador determinista.)*

---

## 11. Entregables finales

- Repositorio con el código, `README.md` de instalación y `.env.example`
- SQL completo de Supabase, con políticas RLS
- Aplicación desplegada en Vercel con su URL
- Descripción del escenario de automatización a configurar en Make o n8n
- Lista de decisiones técnicas tomadas, con su justificación y las alternativas
  descartadas

---

## 12. Cómo tratarme durante el trabajo

Explícame en español y sin jerga innecesaria. Cuando una decisión tenga alternativas
reales, muéstrame las opciones con sus consecuencias y recomiéndame una en vez de
elegir en silencio. Si algo de este documento es inviable, contradictorio o hay una
forma claramente mejor, dímelo antes de construirlo.
