-- ----------------------------------------------------------------------------
-- Se retira la tabla `plantillas`.
--
-- Nació para guardar documentos de referencia reutilizables entre proyectos,
-- pero esa función quedó cubierta por `proyectos.plantilla_md`: la plantilla se
-- escribe al crear o editar el proyecto y la pantalla de nueva reunión la
-- hereda sola al elegirlo. La tabla nunca llegó a leerse ni escribirse desde la
-- aplicación —no existe una sola consulta a `plantillas` en el código— y su
-- pantalla era un estado vacío con el botón deshabilitado.
--
-- Dejarla costaba mantenerla: políticas, trigger e índice que revisar en cada
-- auditoría de seguridad para algo que no guarda nada.
--
-- Si algún día hacen falta plantillas compartidas entre clientes, se vuelve a
-- crear con lo que se necesite entonces; conservar el cascarón no ahorra ese
-- trabajo.
-- ----------------------------------------------------------------------------

drop trigger if exists plantillas_updated_at on public.plantillas;
drop table if exists public.plantillas;
