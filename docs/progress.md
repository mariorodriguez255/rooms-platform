# Progreso del proyecto

Estado de los hitos de la sección 13 del briefing. Se actualiza al terminar cada hito (regla 10 de `CLAUDE.md`).

Leyenda: ⬜ pendiente · 🟡 en curso · ✅ hecho

| Hito                                 | Estado                           | Hecho cuando                                                                       |
| ------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------- |
| 0 — Cimientos                        | ✅ Hecho (2026-10-20, PR #1)     | El proyecto arranca en local, los tests pasan y hay un despliegue de vista previa  |
| 1 — Cuentas y organizaciones         | 🟡 En curso (rama `feat/hito-1`) | Dos organizaciones de prueba no pueden ver datos la una de la otra                 |
| 2 — Pisos y habitaciones             | ⬜ Pendiente                     | El operador ve el estado de todas sus habitaciones en una pantalla                 |
| 3 — Formulario del candidato         | ⬜ Pendiente                     | Un candidato puede postularse desde el móvil sin registrarse                       |
| 4 — Puntuación y pipeline            | ⬜ Pendiente                     | El operador ve un ranking explicado y puede aceptar a un candidato                 |
| 5 — Bandeja de leads por email       | ⬜ Pendiente                     | Un aviso reenviado de idealista crea un lead y envía el formulario automáticamente |
| 6 — Paquete de anuncio               | ⬜ Pendiente                     | Publicar una habitación en tres portales lleva menos de cinco minutos              |
| 7 — Facturación y lanzamiento piloto | ⬜ Pendiente                     | Un operador piloto puede pagar y usar la plataforma de forma autónoma              |

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

Pendiente para cerrar el hito:

- [x] Mario: crear el proyecto de Supabase en `eu-central-1` (ref `dnwzdrnleixdeamqtifa`). Sus URLs de Auth están en `[remotes.cloud]` de `supabase/config.toml`.
- [x] Auth configurado en la nube con `supabase config push` (URLs, confirmación de email, 12 caracteres, `secure_password_change`, sin MFA por ahora) y migración aplicada con `supabase db push` (comprobado con `migration list`).
- [x] Tests de pgTAP contra la nube (`supabase test db --linked`): todos los de aislamiento en verde a la primera. El de invariantes detectó `public.rls_auto_enable()`, una función de _event trigger_ que crea Supabase en la nube (activa RLS en tablas nuevas, por el nombre); como no se puede invocar, el invariante ahora excluye las funciones de trigger. Pendiente de confirmar el 95/95 tras el ajuste. Nota: el CLI deja instalada la extensión `pgtap` en la nube (inofensiva, esquema no expuesto).
- [ ] Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en Vercel (no la clave secreta).
- [ ] Probar en la vista previa: registro con el email de Mario (el SMTP incluido solo envía a miembros del equipo de Supabase; abrir el enlace en el mismo navegador), crear organización e invitar.
- [ ] CI en verde en el PR y revisión de Mario.

Pendiente para hitos posteriores:

- **SMTP propio** (Resend o Postmark) antes de que se registre nadie que no sea del equipo: Hito 3. Con él se activan las plantillas de email en español (ahora salen las de Supabase, en inglés, y los enlaces solo funcionan en el mismo navegador: ver ADR 0004).
- **Proxy fuera de la UE**: Vercel ejecuta `proxy.ts` en todas sus regiones (ver ADR 0003). Confirmar antes del piloto que la cookie de sesión está cubierta por el DPA de Vercel, o reducir lo que procesa el proxy.
- Al pasar a Supabase Pro: comprobación de contraseñas filtradas. MFA más adelante.
- Borrado de cuentas y organizaciones (y qué pasa si se borra el único owner): Hito 7.
