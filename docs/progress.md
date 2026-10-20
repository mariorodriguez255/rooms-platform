# Progreso del proyecto

Estado de los hitos de la sección 13 del briefing. Se actualiza al terminar cada hito (regla 10 de `CLAUDE.md`).

Leyenda: ⬜ pendiente · 🟡 en curso · ✅ hecho

| Hito                                 | Estado                                                  | Hecho cuando                                                                       |
| ------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 0 — Cimientos                        | 🟡 En revisión (PR #1; falta verificar la vista previa) | El proyecto arranca en local, los tests pasan y hay un despliegue de vista previa  |
| 1 — Cuentas y organizaciones         | ⬜ Pendiente                                            | Dos organizaciones de prueba no pueden ver datos la una de la otra                 |
| 2 — Pisos y habitaciones             | ⬜ Pendiente                                            | El operador ve el estado de todas sus habitaciones en una pantalla                 |
| 3 — Formulario del candidato         | ⬜ Pendiente                                            | Un candidato puede postularse desde el móvil sin registrarse                       |
| 4 — Puntuación y pipeline            | ⬜ Pendiente                                            | El operador ve un ranking explicado y puede aceptar a un candidato                 |
| 5 — Bandeja de leads por email       | ⬜ Pendiente                                            | Un aviso reenviado de idealista crea un lead y envía el formulario automáticamente |
| 6 — Paquete de anuncio               | ⬜ Pendiente                                            | Publicar una habitación en tres portales lleva menos de cinco minutos              |
| 7 — Facturación y lanzamiento piloto | ⬜ Pendiente                                            | Un operador piloto puede pagar y usar la plataforma de forma autónoma              |

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

Pendiente para cerrar el hito:

- [ ] Verificar la URL de vista previa de Vercel del PR #1.
- [ ] Fusionar el PR #1 en `main` (eso arregla el despliegue de producción, que falla porque `main` aún no tiene la aplicación).

Pendiente para el Hito 1:

- Crear el proyecto de Supabase en la nube (`eu-central-1`, Frankfurt) y sus variables en Vercel.
- Clientes de Supabase (`@supabase/ssr`), validación de variables de entorno con Zod y tests de Supabase en la CI.
- Revisar la configuración de Auth de `supabase/config.toml` (longitud de contraseña, confirmación de email…).
- Docker Desktop tiene unos 4 GB de RAM asignados: suficiente por ahora; subirlo si Supabase local va lento.
