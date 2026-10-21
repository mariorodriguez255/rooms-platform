# 0009 — Fotos de pisos y habitaciones en Storage

- Fecha: 2026-10-21
- Estado: aceptada

## Contexto

El Hito 2 guarda fotos de cada habitación y de las zonas comunes de cada piso. Servirán para el formulario público (Hito 3) y para el paquete de anuncio (Hito 6). Pueden mostrar pertenencias de los inquilinos actuales y las fotos del móvil llevan la ubicación GPS en sus metadatos. Restricciones: Vercel rechaza peticiones de más de 4,5 MB en cualquier plan; las transformaciones de imagen de Supabase no están en el plan Free (1 GB de Storage).

## Decisión

- **Bucket `photos` privado**, creado en una migración escrita a mano (los buckets son filas de `storage.buckets` y los diffs de esquema no los capturan). Solo JPEG y como máximo 3 MiB por archivo.
- **Rutas `<org_id>/<property_id>/<uuid>.jpg`.** Las políticas de `storage.objects` solo dejan leer, subir y borrar a los miembros de la organización de la primera carpeta. El ayudante `private.org_from_path()` devuelve `null` si esa carpeta no es un UUID, para denegar sin provocar un error. No hay política de `update`: los archivos nunca se sobrescriben. La tabla `photos` exige que `storage_path` tenga esa forma y esté en la carpeta de su piso.
- **El navegador redimensiona antes de subir** (`src/lib/photos/resize.ts`): como máximo 2048 px por el lado largo y JPEG de calidad 0,85 (baja a 0,7 o 0,5 solo si aún pesa más de 3 MiB). Una foto de móvil de 3–8 MB queda en unos cientos de KB, y al volver a codificarla **se eliminan los metadatos EXIF, incluida la ubicación GPS**. La rotación EXIF se aplica antes (`imageOrientation: "from-image"`).
- **Subida por Server Action, una foto por petición** (`uploadPhoto`). La acción comprueba que el piso o la habitación es de la organización activa, el tamaño y la firma JPEG de los bytes (no el nombre ni el tipo que declara el navegador). Después sube el archivo con la sesión del usuario (las políticas de Storage aplican) e inserta la fila. Si la fila falla (por ejemplo, por el límite de 20), borra el archivo. `experimental.serverActions.bodySizeLimit` sube a 4 MB (Next admite 1 MB por defecto).
- **Visualización con URLs firmadas de 1 hora**, generadas en bloque en el servidor (`createSignedUrls`) y pintadas con `next/image` `unoptimized` y con `width`/`height` para reservar el hueco.
- **Borrado: primero la fila y después el archivo**, con la API de Storage. Si el archivo no se puede borrar, queda huérfano dentro de la carpeta de la organización (invisible) en vez de una foto rota en la página. Supabase advierte de que borrar en `storage.objects` con SQL deja el archivo huérfano y se sigue pagando; Storage además lo bloquea por defecto.

## Alternativas descartadas

- **Bucket público**: más simple y cacheable, pero cualquiera con la URL vería las fotos para siempre, incluso antes de que el operador decida publicarlas. Privacidad por defecto.
- **Subida directa del navegador a Storage** (URL firmada de subida): evita pasar por Vercel y es lo indicado para archivos grandes. Con fotos de menos de 3 MiB, la Server Action mantiene un único camino validado en el servidor y el patrón del Hito 1 (actuar siempre sobre la organización activa). Si algún día se suben vídeos u originales, se cambia.
- **Redimensionar en el servidor** (sharp) o con las transformaciones de Supabase: más carga en las funciones o un plan de pago, y la ubicación GPS viajaría igualmente hasta el servidor.
- **Optimización de imágenes de Vercel**: las URLs firmadas cambian en cada visita, así que no podría cachearlas y gastaría la cuota del plan.

## Consecuencias

- Subir fotos necesita JavaScript (el resto de la app funciona sin él).
- Si el navegador no sabe decodificar un formato (por ejemplo, HEIC en algunos navegadores de escritorio), se muestra un error claro. Hay que comprobarlo en un iPhone real.
- Cada visita genera URLs nuevas, así que el navegador no reutiliza la caché entre visitas. Con el plan Free (5 GB de transferencia al mes) basta para desarrollo; el piloto irá en Pro.
- Los archivos huérfanos (si falla un borrado) se podrán limpiar con el borrado automático del Hito 7.
- El orden de las fotos es el de subida; reordenarlas llega con el paquete de anuncio (Hito 6), que añadirá una columna de posición.
- En el Hito 3, el formulario público mostrará las fotos con URLs firmadas generadas en el servidor tras validar el token de la habitación.
