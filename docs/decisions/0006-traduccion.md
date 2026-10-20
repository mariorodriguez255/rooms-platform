# 0006 — Textos de la interfaz: next-intl sin rutas por idioma

- Fecha: 2026-10-20
- Estado: aceptada

## Contexto

La interfaz es en español, pero Mario quiere poder añadir inglés más adelante (decisión pendiente desde el Hito 0). El proyecto usa Cache Components, que penaliza leer cabeceras o cookies en páginas que podrían ser estáticas.

## Decisión

- **next-intl 4**, sin rutas por idioma (no hay `/es/…` en la URL) y con el idioma fijo `es` (`src/i18n/config.ts` y `src/i18n/request.ts`).
- Todos los textos están en `src/messages/es.json`, también los mensajes de error y de validación. Los esquemas Zod y las funciones SQL devuelven **claves**, y la interfaz las traduce.
- **Claves con tipos:** `t("auth.login.title")` no compila si la clave no existe (`src/types/next-intl.d.ts`).
- No se usa el extractor de mensajes de next-intl (`useExtracted`). Sus dependencias (`@swc/core`, `@parcel/watcher`) se instalan con los scripts de instalación bloqueados.

## Alternativas descartadas

- **Diccionario propio**: menos dependencias, pero habría que reinventar plurales, formato ICU, fechas y la integración con Server y Client Components.
- **Rutas por idioma desde ya** (`/es/…`): cambia todas las URLs para un idioma que todavía no existe.

## Consecuencias

- Las páginas públicas siguen siendo estáticas con Cache Components (comprobado en `next build`).
- Para añadir inglés: crear `src/messages/en.json`, añadir `en` a `locales` y decidir cómo se elige el idioma (preferencia del usuario o cookie). Las rutas por idioma solo harían falta si las páginas públicas necesitan SEO en varios idiomas.
