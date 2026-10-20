# 0004 — Autenticación y sesiones

- Fecha: 2026-10-20
- Estado: aceptada

## Contexto

El Hito 1 necesita registro, inicio de sesión y recuperación de contraseña. El stack fija Supabase Auth. Next.js 16 sustituye `middleware.ts` por `proxy.ts`, y el proyecto usa Cache Components, que no deja leer cookies fuera de un `<Suspense>`.

## Decisión

- **Email y contraseña** con Supabase Auth, **confirmación de email obligatoria** y recuperación por email. Contraseña de **12 caracteres mínimo, sin reglas de composición** (NIST SP 800-63B: lo que cuenta es la longitud).
- **Sesión en cookies con `@supabase/ssr`.** `src/proxy.ts` refresca el token con `getClaims()` en cada petición, porque los Server Components no pueden escribir cookies, y redirige según `src/lib/auth/routes.ts`.
- **El proxy no es la barrera de seguridad.** Cada página y cada Server Action vuelve a leer la sesión (Data Access Layer en `src/lib/auth/session.ts`) y RLS filtra todas las consultas. Las Server Actions nunca se fían de un `org_id` que mande el navegador: actúan sobre la organización activa.
- **Organización activa en una cookie `httpOnly`** (`active_org`). Solo elige entre las membresías del usuario, así que manipularla no da acceso a nada. Se descartó llevarla en la URL (`/o/[slug]/…`): la mayoría de operadores tendrán una sola organización.
- **Enlaces de email que llegan a `/auth/confirm`**, que acepta dos formatos:
  - **Ahora: plantillas por defecto de Supabase.** El plan Free no permite cambiar las plantillas mientras se use el SMTP incluido. El enlace pasa por Supabase, que verifica el email y redirige a `/auth/confirm?code=…`. La app canjea el código por una sesión (PKCE). Ese canje necesita una cookie que se guardó al pedir el email, así que **solo funciona en el mismo navegador**. En otro navegador, el email de registro queda confirmado igualmente y se pide iniciar sesión; para recuperar la contraseña hay que usar el mismo navegador. Los emails salen en inglés.
  - **Con el SMTP propio (Hito 3): plantillas en español** de `supabase/templates/`. Usan `token_hash`, funcionan en cualquier navegador y construyen el enlace a partir de `{{ .RedirectTo }}`, no de `{{ .SiteURL }}`, para que un registro en una vista previa de Vercel vuelva a esa vista previa.
- **Tras iniciar sesión, confirmar el email o salir de una organización**, el servidor decide el destino (`homePath`): el panel, o el onboarding si el usuario aún no tiene organización. Así no hay que redirigir desde dentro del `<Suspense>` de una página, cosa que el navegador tendría que rehacer.
- **`?next=` validado** (`safeNextPath`): solo rutas del mismo sitio. Evita redirecciones abiertas.
- **Sin caché de datos de sesión.** `createClient()` llama a `connection()`: todo lo que pasa por Supabase espera a una petición real. Las páginas prerenderizan el título y la estructura, y el contenido de la sesión llega en streaming detrás de un `<Suspense>` dentro de la página. Se descartó `use cache: private`: guardaría datos de la organización en el navegador hasta 5 minutos, y alguien expulsado los seguiría viendo.

## Alternativas descartadas

- **Enlace mágico u OAuth (Google)**: no son necesarios para el MVP. Se pueden añadir si los pilotos los piden.
- **Organizaciones en el JWT** (_custom access token hook_): RLS sería más barato, pero al quitar a alguien de una organización conservaría el acceso hasta que caducara el token.
- **`loading.tsx` como límite de Suspense**: con Partial Prefetching, la validación de navegación instantánea de Next no lo acepta para estas páginas. Un `<Suspense>` explícito dentro de cada página sí.

## Consecuencias

- Hace falta un **SMTP propio** antes de abrir el registro a terceros: el SMTP incluido en Supabase solo envía a los miembros del equipo del proyecto. Se configura cuando se elija el proveedor de email saliente (Hito 3), y con él se activan las plantillas en español (descomentarlas en `supabase/config.toml` y hacer `config push`).
- **URLs de redirección permitidas en la nube** (`[remotes.cloud]` en `supabase/config.toml`): solo `/auth/confirm` en producción y en las vistas previas de este proyecto y esta cuenta de Vercel (`rooms-platform-*-mariorodriguez255s-projects.vercel.app`). Nunca un comodín amplio como `**.vercel.app`: cualquier usuario de Vercel podría recibir los tokens de los enlaces. Queda un riesgo residual mientras se acepten vistas previas, por eso el proyecto de producción del piloto solo permitirá la URL de producción.
- Al pasar a Supabase Pro, activar la comprobación de contraseñas filtradas.
- MFA queda para más adelante.
