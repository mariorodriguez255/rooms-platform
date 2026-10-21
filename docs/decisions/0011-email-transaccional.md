# 0011 — Email transaccional: Resend detrás de `EmailSender`

- Fecha: 2026-10-21
- Estado: aceptada

## Contexto

El Hito 3 envía dos emails por candidatura: la confirmación al candidato y el aviso al operador. El briefing propone Resend o Postmark. Ninguno guarda los datos en la UE:

- **Postmark:** servidores en EE. UU.
- **Resend:** envía desde Irlanda, pero guarda logs y metadatos en EE. UU., con certificación del EU-U.S. Data Privacy Framework y cláusulas contractuales tipo.

Se valoró Brevo (Francia, datos en la UE), pero Mario eligió Resend, como propone el briefing. Todavía no hay dominio propio.

## Decisión

- **Interfaz `EmailSender`** (`src/lib/providers/email/`), como exige CLAUDE.md para los proveedores externos. Se elige con `EMAIL_PROVIDER`:
  - `resend`: producción y vistas previas. La API REST se llama con `fetch`: un único endpoint no justifica otra dependencia.
  - `mailpit`: local y CI. Usa la API de envío del Mailpit de Supabase local, de modo que los tests e2e leen los emails igual que en el Hito 1.
  - `disabled`: no envía nada y deja en el log solo que no se envió.
- **Un destinatario por mensaje:** nadie ve a quién más le llegó.
- **Contenido mínimo:**
  - **Al candidato:** a qué habitación se ha postulado y quién gestiona sus datos. Responder va al `contact_email` del operador.
  - **A los miembros:** el nombre del candidato y un enlace a la candidatura en la app. Nunca respuestas ni datos de contacto, porque el email es menos seguro que la app.
- **HTML hecho a mano**, con cada línea escapada (el nombre del candidato lo escribe él) y asuntos en una sola línea. Se descartó React Email: más dependencias para dos emails.
- **Envío con `after()`**, después de responder al candidato. Si falla, la candidatura ya está guardada y queda un error en el log, sin direcciones ni contenido. Sin claves de idempotencia: no se reintenta, y repetir la clave en un segundo envío del mismo candidato haría que Resend rechazara el mensaje.
- **El hook de secretos** reconoce las claves de Resend (`re_…`).

## Alternativas descartadas

- **Brevo** (datos en la UE, 300 emails al día gratis, recepción de emails): encaja mejor con «datos en la UE», pero queda fuera del briefing y Mario prefirió Resend. Cambiarlo solo exige otra implementación de `EmailSender`.
- **SDK de Resend**: más dependencias para una sola llamada.

## Consecuencias

- **Sin dominio verificado**, Resend solo envía desde `onboarding@resend.dev` y únicamente al email de la propia cuenta de Resend. En las vistas previas basta para probar con el email de Mario. Para enviar a cualquiera hace falta un dominio con sus registros DNS.
- **El SMTP de Supabase Auth con Resend y las plantillas en español** (`supabase/templates/`) siguen pendientes hasta tener dominio: el SMTP de Resend tampoco envía a terceros sin él.
- **Plan gratuito de Resend:** 3.000 emails al mes y 100 al día. Con 2–3 emails por candidatura basta para el piloto. Al crecer, plan Pro.
- **El texto de privacidad del formulario** avisa de que los emails se envían con un proveedor que puede tratar los datos en EE. UU. con las garantías del RGPD.
