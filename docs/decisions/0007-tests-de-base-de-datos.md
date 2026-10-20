# 0007 — Tests de base de datos: pgTAP más integración contra la API

- Fecha: 2026-10-20
- Estado: aceptada

## Contexto

La regla 6 de `CLAUDE.md` exige un test de aislamiento para cada tabla. El criterio de cierre del Hito 1 es que dos organizaciones no vean los datos la una de la otra.

## Decisión

Tres capas, cada una con un propósito:

1. **pgTAP** (`supabase/tests/`, `pnpm db:test`): cada política y cada función SQL, incluidas las escrituras denegadas (comprobando además que la fila sigue intacta). Cada archivo corre en una transacción que se deshace al final. Los ayudantes (`_helpers.psql`) se crean dentro de esa transacción: nunca llegan a una migración. Los usuarios de prueba usan `example.org` para no depender del seed (`example.com`).
2. **Integración con Vitest** (`tests/integration/`, `pnpm test:integration`): el mismo escenario a través de la API real (PostgREST y Auth). Detecta lo que pgTAP no ve: permisos de la API, esquemas publicados y la llamada a las RPC desde supabase-js.
3. **Playwright** (`tests/e2e/`): los flujos de usuario completos, con los emails leídos de Mailpit.

Para comprobar que los tests vigilan de verdad, se rompieron a propósito una política, el trigger de roles y el RLS de una tabla nueva, y los tests fallaron.

## Alternativas descartadas

- **Solo Vitest contra la API**: más lento, necesita limpiar los datos después y no prueba directamente las políticas de escritura.
- **Paquete de ayudantes de pgTAP de terceros** (basejump): instalarlo pasa por dbdev, y los ayudantes que necesitamos son unas pocas líneas.

## Consecuencias

- La CI levanta Supabase local en Docker (job «Database, integration and end-to-end tests») y comprueba también que `src/types/database.ts` está al día con las migraciones.
- `pnpm test` sigue sin necesitar base de datos.
