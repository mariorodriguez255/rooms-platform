# 0002 — TypeScript 5.9 y ESLint 9 (no las últimas versiones)

- Fecha: 2026-10-20
- Estado: aceptada

## Contexto

En octubre de 2026 la última versión de TypeScript en npm es la 7.0 y la de ESLint, la 10. Sin embargo:

- `typescript-eslint` (las reglas de ESLint para TypeScript, que usa `eslint-config-next`) solo admite TypeScript `>=4.8.4 <6.1.0`.
- Tres plugins que incluye `eslint-config-next` (`eslint-plugin-react`, `eslint-plugin-import` y `eslint-plugin-jsx-a11y`) solo declaran compatibilidad hasta ESLint 9.
- La plantilla oficial de `create-next-app@16.4.2` instala `typescript@^5` y `eslint@^9`.

## Decisión

Mantener **TypeScript 5.9** y **ESLint 9.39**, como la plantilla oficial de Next.js.

## Alternativas descartadas

- **TypeScript 7 / 6.0**: el linter dejaría de estar soportado (7) o nos saldríamos de lo que prueba Next (6.0).
- **ESLint 10**: pnpm avisa de que ESLint 9 está _deprecated_, pero subir rompería la compatibilidad declarada de los plugins de Next.

## Consecuencias

- Revisar esta decisión cuando `eslint-config-next` y `typescript-eslint` admitan las versiones nuevas. Dependabot abrirá los PR; no se aceptan hasta que los peers lo permitan.
- El aviso de _deprecated_ de ESLint 9 al instalar es esperado.
