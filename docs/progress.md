# Progreso del proyecto

Estado de los hitos de la sección 13 del briefing. Se actualiza al terminar cada hito (regla 10 de `CLAUDE.md`).

Leyenda: ⬜ pendiente · 🟡 en curso · ✅ hecho

| Hito                                 | Estado                            | Hecho cuando                                                                       |
| ------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------- |
| 0 — Cimientos                        | ✅ Hecho (2026-10-20, PR #1)      | El proyecto arranca en local, los tests pasan y hay un despliegue de vista previa  |
| 1 — Cuentas y organizaciones         | ✅ Hecho (2026-10-20, PR #5 y #6) | Dos organizaciones de prueba no pueden ver datos la una de la otra                 |
| 2 — Pisos y habitaciones             | ✅ Hecho (2026-10-21, PR #7)      | El operador ve el estado de todas sus habitaciones en una pantalla                 |
| 3 — Formulario del candidato         | 🟡 En revisión                    | Un candidato puede postularse desde el móvil sin registrarse                       |
| 4 — Puntuación y pipeline            | ⬜ Pendiente                      | El operador ve un ranking explicado y puede aceptar a un candidato                 |
| 5 — Bandeja de leads por email       | ⬜ Pendiente                      | Un aviso reenviado de idealista crea un lead y envía el formulario automáticamente |
| 6 — Paquete de anuncio               | ⬜ Pendiente                      | Publicar una habitación en tres portales lleva menos de cinco minutos              |
| 7 — Facturación y lanzamiento piloto | ⬜ Pendiente                      | Un operador piloto puede pagar y usar la plataforma de forma autónoma              |

## Registro

### 2026-10-20 — Preparación del directorio

Hecho:

- Carpeta `rooms-platform/` creada y repositorio git inicializado (rama `main`, sin commits todavía).
- Briefing original copiado en `docs/briefing.pdf` y convertido a `docs/briefing.md`.
- `CLAUDE.md` creado con resumen del producto, stack, invariantes, convenciones y reglas de trabajo.
- `docs/progress.md` (este archivo) y `docs/decisions/` creados.

Pendiente:

- Presentar el plan detallado del Hito 0 y esperar aprobación antes de escribir código.

### 2026-10-20 — Preparación para repositorio público

Decisiones:

- El repositorio será **público** en GitHub.
- El briefing (`docs/briefing.md` y `.pdf`) contiene el plan de negocio: **queda fuera del repo**, solo en local. Mario debe guardar una copia en un sitio privado.
- Los commits se firman con el nombre y el email de la cuenta de GitHub de Mario (configurado solo en este repo). El email queda visible en el historial público; decisión consciente.

Hecho:

- `.gitignore` preparado para secretos, datos privados (`private/`), Next.js, Supabase, Vercel y tests.
- Hook `.githooks/pre-commit` que bloquea archivos prohibidos y patrones de claves; probado con claves falsas en un repo temporal.
- Sección «Repositorio público» añadida a `CLAUDE.md`.

### 2026-10-20 — Hito 0: Cimientos

Hecho (rama `chore/hito-0`, PR #1):

- Next.js 16.4 (App Router) + TypeScript 5.9 estricto (con `noUncheckedIndexedAccess`) + Tailwind CSS 4 + shadcn/ui (base Radix). Página provisional en español con `<html lang="es">`.
- Prettier (con orden de clases de Tailwind) + ESLint 9 de Next.
- Vitest 5 + Testing Library + cobertura v8 (`tests/unit/`). Playwright con perfiles de escritorio y móvil (`tests/e2e/`).
- Supabase local con el CLI 2.121 fijado como dependencia (Postgres 17), `seed.sql` vacío, scripts `db:*` y tipos generados en `src/types/database.ts`.
- `.env.example` con las variables de Supabase vacías; script `prepare` que activa el hook al instalar.
- CI en GitHub Actions: formato, lint, tipos, tests con cobertura, build y e2e; workflow aparte de gitleaks (commits nuevos en PR y push; historial completo cada lunes); Dependabot con 3 días de espera. Actions fijadas por hash. CI en verde en el PR #1.
- Vercel conectado al repo (plan Hobby) con las funciones en `fra1` (Frankfurt).
- README, licencia «todos los derechos reservados» y ADR 0001–0003.
- Repo publicado en `github.com/mariorodriguez255/rooms-platform` con Secret scanning, Push protection y Dependabot alerts activados. Revisión manual del historial publicado: sin secretos, archivos privados ni datos personales. Remoto por SSH.

Decisiones:

- **pnpm 12** con `minimumReleaseAge` de 3 días y scripts de instalación bloqueados (ADR 0001). Ya bloqueó `shadcn@4.22.1`; se usó la 4.22.0.
- **TypeScript 5.9 y ESLint 9**, no las últimas, por compatibilidad con `typescript-eslint` y los plugins de Next (ADR 0002).
- **Frankfurt** para Vercel y, en el Hito 1, para Supabase (ADR 0003). El build de Vercel corre en `iad1`, pero solo procesa código.
- **Docker Desktop** como runtime de contenedores (gratis para uso personal y pequeñas empresas; OrbStack es de pago para uso comercial).
- **Vercel Hobby** durante el desarrollo; pasar a **Pro antes del primer operador piloto** (Hobby es solo para uso no comercial).
- `agentRules: false` en `next.config.ts`: Next no genera `AGENTS.md`; `CLAUDE.md` apunta a la documentación de Next incluida en `node_modules`.
- El hook de secretos acepta las referencias exactas `"env(NOMBRE)"` de `supabase/config.toml` (probado con casos que deben pasar y casos que deben bloquearse).
- Vite 8 resuelve los alias de `tsconfig` por sí mismo (`resolve.tsconfigPaths`): no se usa `vite-tsconfig-paths`.
- Librería de traducción: se decide al empezar el Hito 1.

Cierre del hito:

- [x] Vista previa de Vercel del PR #1 verificada por Mario (la página se ve; protegida con Vercel Authentication).
- [x] PR #1 fusionado en `main` por fast-forward (se conservan los commits y sus hashes). El despliegue de producción se rehace desde `main`.

Pendiente para el Hito 1:

- Crear el proyecto de Supabase en la nube (`eu-central-1`, Frankfurt) y sus variables en Vercel.
- Clientes de Supabase (`@supabase/ssr`), validación de variables de entorno con Zod y tests de Supabase en la CI.
- Revisar la configuración de Auth de `supabase/config.toml` (longitud de contraseña, confirmación de email…).
- Docker Desktop tiene unos 4 GB de RAM asignados: suficiente por ahora; subirlo si Supabase local va lento.

### 2026-10-20 — Hito 1: Cuentas y organizaciones

Plan aprobado por Mario con estas respuestas: invitaciones por enlace copiable; matriz de roles propuesta; textos en español pero preparados para inglés; contrato de encargo de tratamiento en el Hito 7; contraseña mínima de 12 caracteres.

Hecho (rama `feat/hito-1`):

- **Base de datos** (`supabase/migrations/20261020163539_tenancy.sql`): `organizations`, `members`, `profiles` e `invitations` con RLS; ayudantes en el esquema `private`; RPC `create_organization`, `create_invitation`, `get_invitation` y `accept_invitation`; trigger que protege a los owners y garantiza que siempre haya uno; `anon` sin privilegios por defecto (ADR 0005).
- **Auth**: registro con confirmación de email, inicio y cierre de sesión, recuperación de contraseña, `/auth/confirm`, `proxy.ts` con `@supabase/ssr` y Data Access Layer (ADR 0004). Plantillas de email en español.
- **Organizaciones**: onboarding, selector de organización, ajustes (renombrar), miembros (cambiar rol, quitar, salir), invitaciones por enlace e invitaciones pendientes (anular), y `/invite/[token]`.
- **Traducción**: next-intl sin rutas por idioma, con claves tipadas (ADR 0006).
- **Tests** (ADR 0007): 95 de pgTAP (políticas, funciones e invariantes del esquema), 6 de integración contra la API de Supabase local, 45 unitarios y 8 e2e × 2 (escritorio y móvil). Los tests de BD se comprobaron rompiendo a propósito una política, el trigger y el RLS.
- **CI**: job nuevo que levanta Supabase local y ejecuta pgTAP, la comprobación de tipos generados, integración, build y e2e.
- Seed ficticio con dos organizaciones (usuarios en el README).

Decisiones (además de los ADR):

- **`<select>` nativo** (componente `native-select` de shadcn) en lugar del Select de Radix: con React 19.3 y Cache Components, Radix no mostraba el valor hasta abrirlo. El nativo además funciona sin JavaScript y abre el selector del sistema en el móvil.
- **`Suspense` explícito dentro de cada página** en vez de `loading.tsx`: la validación de navegación instantánea de Next no acepta `loading.tsx` con Partial Prefetching.
- **`connection()` en `createClient()`**: el cliente de Supabase usa la hora actual (caducidad del token), que Cache Components no permite al prerenderizar.
- **Cabecera y lista de miembros adaptadas al móvil**: los e2e en móvil detectaron que la navegación tapaba el menú.
- **Plantillas de email por defecto** mientras no haya SMTP propio: el primer `config push` falló porque el plan Free no admite plantillas propias con el SMTP incluido. `/auth/confirm` acepta ahora también el `?code=` de PKCE.
- **Ajustes de la nube** en `[remotes.cloud]`: URLs de Auth restringidas a `/auth/confirm`, un email de Auth por minuto y códigos de 8 dígitos. El tamaño del pooler no se declara (lo fija Supabase según la máquina).
- Falsos positivos del hook de secretos (claves de mensajes como `weakPassword` y contraseñas ficticias de los tests) marcados con `secret-scan:allow`.

Cierre del hito:

- [x] Mario: crear el proyecto de Supabase en `eu-central-1` (ref `dnwzdrnleixdeamqtifa`). Sus URLs de Auth están en `[remotes.cloud]` de `supabase/config.toml`.
- [x] Auth configurado en la nube con `supabase config push` (URLs, confirmación de email, 12 caracteres, `secure_password_change`, sin MFA por ahora) y migración aplicada con `supabase db push` (comprobado con `migration list`).
- [x] Tests de pgTAP contra la nube (`supabase test db --linked`): todos los de aislamiento en verde a la primera. El de invariantes detectó `public.rls_auto_enable()`, una función de _event trigger_ que crea Supabase en la nube (activa RLS en tablas nuevas, por el nombre); como no se puede invocar, el invariante ahora excluye las funciones de trigger. Tras el ajuste, 95/95 en la nube. Nota: el CLI deja instalada la extensión `pgtap` en la nube (inofensiva, esquema no expuesto).
- [x] Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en Vercel, de tipo _Config_ (son públicas por diseño), en Production y Preview. La clave secreta no está en Vercel.
- [x] Probado por Mario en la vista previa: registro con confirmación de email, creación de organización e invitación aceptada desde otro dispositivo con una segunda cuenta.
  - La segunda cuenta se creó desde el panel de Supabase con _Auto Confirm User_, porque el SMTP incluido solo envía a los miembros del equipo.
  - Para abrir la vista previa en otro dispositivo hizo falta un _Sharable Link_ de Vercel: las vistas previas están protegidas con Vercel Authentication y la producción no.
- [x] CI en verde en el PR #6, que completa al #5, fusionado antes con el trabajo hasta `4480f21` (formato, lint, tipos, unitarios, pgTAP, integración, e2e, build y gitleaks) y revisión de Mario.

Pendiente para hitos posteriores:

- **SMTP propio** (Resend o Postmark) antes de que se registre nadie que no sea del equipo: Hito 3. Con él se activan las plantillas de email en español (ahora salen las de Supabase, en inglés, y los enlaces solo funcionan en el mismo navegador: ver ADR 0004).
- **Proxy fuera de la UE**: Vercel ejecuta `proxy.ts` en todas sus regiones (ver ADR 0003). Confirmar antes del piloto que la cookie de sesión está cubierta por el DPA de Vercel, o reducir lo que procesa el proxy.
- Al pasar a Supabase Pro: comprobación de contraseñas filtradas. MFA más adelante.
- Borrado de cuentas y organizaciones (y qué pasa si se borra el único owner): Hito 7.

### 2026-10-21 — Hito 2: Pisos y habitaciones

Plan aprobado por Mario con las recomendaciones propuestas: staff crea y edita y solo owner/admin borran; fotos también de zonas comunes; estados Libre / Ocupada / No disponible más una fecha; características de la habitación propuestas (las del piso, en el Hito 6); borrado definitivo con confirmación; límites de 100 pisos, 20 habitaciones por piso y 20 fotos por habitación y por zonas comunes.

Hecho (rama `feat/hito-2`):

- **Base de datos** (`…_properties_rooms_photos.sql`): `properties`, `rooms` y `photos` con RLS, claves foráneas compuestas que mantienen cada fila en la organización de su piso, importes en céntimos, permisos por columna, `updated_at` automático y límites contra abusos (ADR 0008).
- **Storage** (`…_photos_storage.sql`): bucket privado `photos` (solo JPEG, 3 MiB) con políticas por carpeta de organización y sin sobrescritura (ADR 0009).
- **Pisos y habitaciones**: lista de pisos, ficha del piso con sus habitaciones, suma de rentas y renta de referencia, ficha de la habitación con precio, fianza, superficie, características y estado; formularios de alta y edición; borrado con confirmación (oculto para staff).
- **Fotos**: redimensionadas a 2048 px en el navegador (sin metadatos EXIF ni GPS), subidas una a una por Server Action, mostradas con URLs firmadas de 1 hora y borradas con la API de Storage.
- **Tablero** (`/dashboard`): todas las habitaciones de la organización agrupadas por piso, con precio y estado (libre, libre desde, se libera el, revisar, ocupada, no disponible), contadores y filtros por grupo como enlaces.
- **Seed** con pisos y habitaciones ficticios en todos los estados (fechas relativas al día del reset).
- **Tests**: 170 de pgTAP (75 nuevos: pisos, habitaciones, fotos y políticas de Storage), 14 de integración (8 nuevos, también contra la API de Storage), 116 unitarios y 13 e2e × 2 (5 nuevos). Se comprobó que fallan al romper a propósito políticas de borrado de habitaciones y de lectura de Storage. Build de producción correcto.

Decisiones (además de los ADR 0008 y 0009):

- **«Hoy» es la fecha de Madrid** y las fechas sin hora se formatean en UTC, para que el día no cambie según el servidor.
- **Importes sin decimales cuando son euros enteros** («450 €/mes»; «450,50 €/mes» si hay céntimos). Para 4 cifras, el formato español de Intl no agrupa los miles («1740 €»), según la norma CLDR.
- **Sin columna de posición en las fotos**: se ordenan por fecha de subida. La propuse en el plan, pero sin poder reordenar no aportaba nada; llegará con el orden de fotos del Hito 6.
- **El texto «Estás trabajando en…» se mantiene** encima del tablero: con varias organizaciones ayuda a saber cuál se está viendo.
- Los tests e2e buscan dentro de `<main>` y solo en lo visible: Next mantiene ocultas las páginas anteriores y su anunciador de rutas repite el título anterior.
- **La CI arranca ahora también Storage** (`storage-api`) en Supabase local: hasta este hito se excluía y los tests de integración de fotos no podían conectar. `imgproxy` sigue fuera (solo sirve transformaciones de imagen, que no usamos).

Cierre del hito:

- [x] CI en verde en el PR #7 (formato, lint, tipos, unitarios, pgTAP, integración, e2e, build y gitleaks). El primer intento falló porque la CI no arrancaba Storage (ver decisiones).
- [x] Mario: vista previa de Vercel revisada y funcionando.
- [x] Migraciones aplicadas en la nube (`supabase db push`, que también crea el bucket) y pgTAP contra la nube (`supabase test db --linked`): 170/170 en verde, incluidas las políticas de Storage.

Pendiente para hitos posteriores:

- Comprobar en un iPhone real la subida de fotos HEIC, si no se hizo en la revisión (si el navegador no puede leerlas se muestra un error, ver ADR 0009).
- Hito 3: el formulario público mostrará las fotos con URLs firmadas generadas en el servidor; una habitación con candidaturas no se podrá borrar (solo marcar como no disponible). Añadir `rooms.public_token`.
- Hito 6: características del piso (ascensor, wifi…) y orden de las fotos.
- Hito 7: limpieza de archivos huérfanos si alguna vez falla un borrado en Storage. Con el plan Free (1 GB de Storage, 5 GB de transferencia al mes) basta para desarrollo; el piloto irá en Supabase Pro.

### 2026-10-21 — Hito 3: Formulario del candidato

Plan aprobado por Mario: email con **Resend** (como propone el briefing; se valoró Brevo por tener los datos en la UE). Todavía **no hay dominio**. Resto, según lo recomendado: sin subida de documentos, sin dirección exacta en el formulario, email de contacto obligatorio para admitir candidaturas, lista de candidaturas de solo lectura, avisos a todos los miembros, cuestionario propuesto (con «Otra situación») y texto de consentimiento provisional.

Hecho (rama `feat/hito-3`):

- **Base de datos** (`…_applications.sql`): `candidates`, `applications` y `consents` con RLS (los miembros leen, nadie escribe desde la API); `rooms.public_token` y `rotate_room_token`; `organizations.contact_email`; funciones `get_public_room` y `submit_application` solo para `service_role`; límite de envíos por IP y por email en `private`; lista de permitidos de las respuestas también en la base de datos; una habitación con candidaturas ya no se puede borrar (ADR 0010).
- **Formulario público** `/apply/[token]`: pensado para el móvil, sin cuenta, con la habitación (sin dirección), fotos, cuestionario, primera capa de información de protección de datos, casillas de mayoría de edad y consentimiento, y campo trampa. La acción del servidor valida con la lista de permitidos y llama a la función con la clave secreta.
- **Emails** con la interfaz `EmailSender` (Resend, Mailpit o desactivado): confirmación al candidato (las respuestas van al operador) y aviso a los miembros con enlace y sin respuestas, enviados después de responder (ADR 0011).
- **Operador:** enlace para candidatos en la ficha de la habitación (copiar, abrir, generar uno nuevo, avisos de por qué está cerrado), lista de candidaturas, ficha de cada candidatura (contacto, respuestas y consentimientos) y email de contacto en Ajustes → Organización.
- **Seed** con emails de contacto, dos enlaces fijos (ver README) y dos candidaturas ficticias.
- **Tests:** 204 de pgTAP (34 nuevos), 20 de integración (6 nuevos), 142 unitarios y 19 e2e × 2 (6 nuevos, entre ellos el «hecho cuando» en móvil). Se comprobó que fallan al dar permiso a `anon` sobre el envío y al quitar el `check` de la lista de permitidos. Build de producción correcto.

Decisiones (además de los ADR 0010 y 0011):

- **El teléfono y el hash de la IP son parámetros opcionales** al final de `submit_application`, para que los tipos generados no obliguen a pasar valores falsos.
- **Las validaciones numéricas devuelven claves traducibles:** un test detectó que Zod devolvía su mensaje interno en inglés con un valor no numérico.
- **Los tests pgTAP filtran por las organizaciones del test**, porque el seed ya trae candidaturas (ADR 0007: los tests no dependen del seed). Al pasarlos contra la nube fallaron dos tests del Hito 2 (fotos y Storage) por el mismo motivo: contaban también las fotos reales subidas al revisar ese hito. Ahora todas las consultas y escrituras que hacen como `postgres` se limitan a las organizaciones del test (reproducido en local con una foto ajena).
- **En los e2e cada test se postula desde su propia IP** (cabecera `X-Forwarded-For`), para no chocar con el límite de 5 envíos. En Vercel esa cabecera no se puede falsificar.
- **La CI usa Mailpit para los emails de la app** y genera un `IP_HASH_SECRET` aleatorio en cada ejecución.
- **Falsos positivos del hook de secretos:** los tokens ficticios del seed, marcados con `secret-scan:allow`.

Cierre del hito:

- [ ] CI en verde en el PR.
- [ ] Mario: variables en Vercel (Production y Preview), y volver a desplegar:
  - `SUPABASE_SECRET_KEY` (Sensitive; Supabase → Project Settings → API Keys → secret).
  - `IP_HASH_SECRET` (Sensitive; `openssl rand -hex 32`).
  - `EMAIL_PROVIDER=resend` y `EMAIL_FROM=rooms-platform <onboarding@resend.dev>`.
  - `RESEND_API_KEY` (Sensitive), de una cuenta de Resend con tu email. Sin dominio, Resend solo entrega a ese email.
  - Alternativa sin emails: `EMAIL_PROVIDER=disabled`.
- [x] Migración aplicada en la nube (`supabase db push`) y pgTAP contra la nube (`supabase test db --linked`): 204/204 en verde, tras limitar los tests de fotos y Storage a sus organizaciones.
- [ ] Mario: en la vista previa, poner el email de contacto en Ajustes, abrir el enlace de una habitación desde el móvil y postularse con tu email.

Pendiente para hitos posteriores:

- **Dominio propio:** con él, `EMAIL_FROM` con ese dominio, el SMTP de Supabase Auth con Resend y las plantillas en español (`supabase/templates/`). Hasta entonces, Auth sigue con el servidor de correo incluido (solo envía al equipo del proyecto).
- **Hito 4:** etapas, puntuación y decisiones sobre las candidaturas.
- **Hito 7:** revisión legal del texto de consentimiento y borrado automático de candidatos descartados a los 30 días (el texto ya lo anuncia; tiene que existir antes del piloto).
- **Si aparece spam:** verificación del email del candidato o captcha (ADR 0010).
