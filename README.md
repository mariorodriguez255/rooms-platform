# rooms-platform

SaaS web B2B para operadores que alquilan pisos por habitaciones en España: candidatos, selección, inquilinos y habitaciones en un solo sitio.

> Proyecto en desarrollo. Estado de los hitos en [`docs/progress.md`](docs/progress.md) y decisiones técnicas en [`docs/decisions/`](docs/decisions/).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Postgres, Auth, Storage) · Vitest · Playwright · Vercel (región UE).

## Requisitos

- Node.js 24 (`nvm use` lee `.nvmrc`)
- pnpm 12 (`npm install -g pnpm`)
- Docker Desktop (u otro runtime compatible con Docker) para Supabase local

## Arranque en local

```bash
pnpm install           # instala dependencias y activa el hook de secretos
cp .env.example .env.local
pnpm db:start          # levanta Supabase local (la primera vez descarga imágenes)
pnpm db:status         # muestra la URL y las claves locales para .env.local
pnpm dev               # http://localhost:3000 (usa localhost, no 127.0.0.1)
```

- Supabase Studio: http://localhost:54323
- Mailpit (los emails que «envía» Supabase local): http://localhost:54324

### Usuarios de prueba

`pnpm db:reset` carga `supabase/seed.sql`: dos organizaciones ficticias que no deben verse entre sí. Todos los usuarios tienen la contraseña `rooms-demo-2026` (solo existe en local).

| Usuario             | Organización          | Rol         |
| ------------------- | --------------------- | ----------- |
| `ana@example.com`   | Pisos Ejemplo Norte   | Propietario |
| `bruno@example.com` | Pisos Ejemplo Norte   | Equipo      |
| `carla@example.com` | Habitaciones Demo Sur | Propietario |

El seed también crea pisos y habitaciones ficticios: dos pisos en «Pisos Ejemplo Norte» (Madrid y Pamplona) y uno en «Habitaciones Demo Sur» (Sevilla). Sus fechas son relativas al día del `db:reset`, para que el tablero muestre siempre todos los estados (libre, libre desde, se libera pronto, ocupada, fecha vencida y no disponible). No incluye fotos.

Para el formulario público (Hito 3) hay dos habitaciones con enlace fijo:

- http://localhost:3000/apply/a1000000000000000000000000000001 (Habitación 1, admite candidaturas; ya tiene dos ficticias)
- http://localhost:3000/apply/a1000000000000000000000000000004 (Habitación 4, No disponible: formulario cerrado)

Para registrar cuentas nuevas, el email de confirmación aparece en Mailpit. Los emails de la app (confirmación al candidato y aviso al operador) también llegan ahí con `EMAIL_PROVIDER=mailpit` (ver `.env.example`).

## Scripts

| Script                                    | Qué hace                                                    |
| ----------------------------------------- | ----------------------------------------------------------- |
| `pnpm dev` / `build` / `start`            | Servidor de desarrollo, build de producción y arranque      |
| `pnpm lint`                               | ESLint                                                      |
| `pnpm typecheck`                          | Genera los tipos de rutas de Next y ejecuta `tsc`           |
| `pnpm format` / `format:check`            | Prettier                                                    |
| `pnpm test` / `test:watch`                | Tests unitarios (Vitest, sin base de datos)                 |
| `pnpm test:coverage`                      | Tests unitarios con cobertura                               |
| `pnpm test:integration`                   | Tests contra la API de Supabase local (necesita `db:start`) |
| `pnpm test:e2e`                           | Tests de extremo a extremo (Playwright, escritorio y móvil) |
| `pnpm db:start` / `db:stop` / `db:status` | Supabase local                                              |
| `pnpm db:reset`                           | Recrea la base local: migraciones + `supabase/seed.sql`     |
| `pnpm db:test`                            | Tests de RLS y funciones SQL con pgTAP (`supabase/tests/`)  |
| `pnpm db:types`                           | Genera `src/types/database.ts` a partir del esquema local   |

La primera vez que ejecutes los tests e2e, instala el navegador: `pnpm exec playwright install chromium`. Los tests de integración y e2e necesitan Supabase local en marcha con el seed cargado.

## Base de datos

- Cada cambio de esquema es una migración nueva en `supabase/migrations/` (`pnpm exec supabase migration new <nombre>`). Después: `pnpm db:reset`, `pnpm db:types` y `pnpm db:test`.
- Toda tabla nueva lleva RLS, `org_id` con índice y su test de aislamiento en `supabase/tests/`. El test `001_schema_invariants` falla si se olvida alguno.
- El proyecto en la nube se actualiza a mano con `pnpm exec supabase db push` (el seed no se sube nunca).
- Los buckets de Storage son filas, no esquema: se crean en una migración escrita a mano (ver `…_photos_storage.sql`). Los archivos se borran siempre con la API de Storage, nunca con SQL.

## Seguridad

El repositorio es público. Nunca se suben secretos ni datos reales: el hook `.githooks/pre-commit` bloquea claves y archivos prohibidos, y la CI ejecuta gitleaks sobre el historial.

## Licencia

Todos los derechos reservados. El código es visible, pero no se concede permiso para usarlo, copiarlo ni distribuirlo.
