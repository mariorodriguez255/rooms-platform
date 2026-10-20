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
pnpm dev               # http://localhost:3000
```

Supabase Studio queda en http://localhost:54323.

## Scripts

| Script                                    | Qué hace                                                    |
| ----------------------------------------- | ----------------------------------------------------------- |
| `pnpm dev` / `build` / `start`            | Servidor de desarrollo, build de producción y arranque      |
| `pnpm lint`                               | ESLint                                                      |
| `pnpm typecheck`                          | Genera los tipos de rutas de Next y ejecuta `tsc`           |
| `pnpm format` / `format:check`            | Prettier                                                    |
| `pnpm test` / `test:watch`                | Tests unitarios (Vitest)                                    |
| `pnpm test:coverage`                      | Tests unitarios con cobertura                               |
| `pnpm test:e2e`                           | Tests de extremo a extremo (Playwright, escritorio y móvil) |
| `pnpm db:start` / `db:stop` / `db:status` | Supabase local                                              |
| `pnpm db:reset`                           | Recrea la base local: migraciones + `supabase/seed.sql`     |
| `pnpm db:types`                           | Genera `src/types/database.ts` a partir del esquema local   |

La primera vez que ejecutes los tests e2e, instala el navegador: `pnpm exec playwright install chromium`.

## Seguridad

El repositorio es público. Nunca se suben secretos ni datos reales: el hook `.githooks/pre-commit` bloquea claves y archivos prohibidos, y la CI ejecuta gitleaks sobre el historial.

## Licencia

Todos los derechos reservados. El código es visible, pero no se concede permiso para usarlo, copiarlo ni distribuirlo.
