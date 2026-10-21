# 0010 — Formulario público del candidato

- Fecha: 2026-10-21
- Estado: aceptada

## Contexto

El Hito 3 permite postularse a una habitación desde el móvil sin registrarse. El briefing exige que el formulario público no use la clave de servicio en el navegador, que pase por una función de servidor que valide el token de la habitación, consentimiento versionado en `consents`, lista de permitidos para los datos que se piden y límite de peticiones. Desde el Hito 1, `anon` no tiene ningún privilegio (ADR 0005).

Mario aprobó: no mostrar la dirección exacta, un email de contacto de la organización obligatorio para admitir candidaturas, lista de candidaturas de solo lectura en este hito, sin subida de documentos y texto de consentimiento provisional hasta la revisión legal (Hito 7).

## Decisión

- **Dos funciones SQL que solo puede ejecutar `service_role`:** `get_public_room(token)` y `submit_application(...)`. El servidor las llama con la clave secreta (`src/lib/supabase/admin.ts`). `anon` sigue sin privilegios, así que nadie puede saltarse las comprobaciones del servidor llamando a la API de Supabase directamente. ESLint prohíbe importar ese cliente fuera de `src/app/apply/` y `src/lib/applications/`.
- **`get_public_room` solo devuelve lo que un candidato necesita**: habitación, municipio, comunidad, precio, fianza, superficie, características, disponibilidad, fotos, nombre de la organización y email de contacto. Nunca la dirección ni identificadores.
- **Token por habitación** (`rooms.public_token`): 128 bits aleatorios en hexadecimal. Se guarda en claro (a diferencia de las invitaciones) porque el enlace está pensado para compartirse y solo permite postularse. Cualquier miembro puede generar uno nuevo (`rotate_room_token`) y el anterior deja de funcionar al momento.
- **El formulario se cierra** si la habitación está «No disponible» o la organización no tiene `contact_email`, que es donde los candidatos ejercen sus derechos.
- **Una transacción por envío** (`submit_application`):
  1. Comprueba el token y que la habitación esté abierta.
  2. Aplica los límites de envíos.
  3. Inserta o actualiza el candidato (por email dentro de la organización; los datos de contacto más recientes ganan).
  4. Inserta o actualiza la candidatura (una por candidato y habitación; un segundo envío sustituye las respuestas).
  5. Registra un consentimiento por envío.
- **Lista de permitidos del cuestionario** (`src/lib/applications/questionnaire.ts`): solo convivencia, fechas y economía. La base de datos comprueba las mismas claves con un `check` y un test unitario mantiene ambas listas iguales. Añadir una pregunta exige una migración: una revisión consciente. La edad se resuelve con una casilla («Soy mayor de edad»), sin fecha de nacimiento.
- **Consentimiento versionado:** los textos están en `src/messages/es.json` bajo `consent.<versión>` y una versión publicada no se edita. `consents.text_version` guarda cuál aceptó cada candidato. La primera capa de información (responsable, finalidad, base, encargado, conservación y derechos) se muestra junto a la casilla.
- **Límite de envíos en Postgres** (`private.hit_rate_limit`, tabla `private.rate_limit_events`): 5 por IP cada 10 minutos, 20 por IP al día y 5 por email al día. Se ejecuta dentro de la transacción del envío, así que solo cuentan los envíos que se guardan.
- **IP del candidato:** la primera entrada de `X-Forwarded-For` (Vercel la fija y sobrescribe la que mande el cliente). Se guarda como HMAC-SHA256 con un secreto (`IP_HASH_SECRET`). Un SHA-256 sin secreto de una IPv4 se podría revertir probando las 4.000 millones posibles.
- **Campo trampa (honeypot):** un campo oculto que las personas no ven. Si llega relleno, se responde «enviada» y no se guarda nada.
- **Página pública** `/apply/[token]`: ruta abierta en el proxy, `noindex` y `referrer: no-referrer` (el token va en la URL). Las fotos se sirven con URLs firmadas generadas en el servidor.
- **Una habitación con candidaturas no se puede borrar** (clave foránea `no action`): se marca como «No disponible». No se usa `restrict` para que borrar una organización entera siga funcionando (la cascada por candidatos elimina las candidaturas en la misma sentencia).

## Alternativas descartadas

- **Funciones públicas para `anon`**: no haría falta la clave secreta en Vercel, pero cualquiera podría llamarlas directamente y saltarse el campo trampa y la validación del servidor.
- **Insertar en las tablas con la clave secreta desde el servidor**: el cliente con clave secreta puede todo. Limitarlo a dos funciones deja explícito qué hace y garantiza que el envío es una sola transacción.
- **Upstash o Redis para el límite de envíos**: otro proveedor más. Con este volumen basta con Postgres.
- **Verificar el email antes de crear la candidatura** (doble opt-in): añade un paso en el móvil. Riesgo aceptado: alguien podría postularse con un email ajeno. Lo mitigan el límite por email y que el dueño real recibe la confirmación. Se puede añadir si aparece spam.
- **Captcha**: añade un tercero y fricción. Lo dejamos para cuando el campo trampa y los límites no basten.

## Consecuencias

- `SUPABASE_SECRET_KEY` e `IP_HASH_SECRET` pasan a ser variables de Vercel (sensibles).
- Antes del piloto (Hito 7): revisión legal del texto de consentimiento y borrado automático de los candidatos descartados a los 30 días, que el texto ya anuncia.
- La tabla de límites se limpia sola (elimina lo que tiene más de un día en cada llamada).
- Las candidaturas no tienen etapas ni nota: llegan en el Hito 4.
