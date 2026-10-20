# 0001 — Gestor de paquetes: pnpm

- Fecha: 2026-10-20
- Estado: aceptada

## Contexto

El repositorio es público y depende de cientos de paquetes de npm. Los ataques a la cadena de suministro (versiones comprometidas que se publican y se instalan en horas, scripts de instalación maliciosos) son un riesgo real. Node 24 trae npm; pnpm hay que instalarlo.

## Decisión

Usar **pnpm 12**, fijado en `package.json` (`packageManager`) y configurado en `pnpm-workspace.yaml` con:

- `minimumReleaseAge: 4320`: no instala versiones publicadas hace menos de 3 días. En el Hito 0 ya bloqueó `shadcn@4.22.1` (2 días) y usamos la 4.22.0.
- `allowBuilds`: los scripts de instalación de dependencias están bloqueados salvo los que se autoricen explícitamente.

Dependabot usa un `cooldown` de 3 días para que sus PR no choquen con esta regla.

## Alternativas descartadas

- **npm**: ya instalado y sin fricción, pero no trae de serie el retraso de versiones ni el bloqueo de scripts por defecto.
- **Yarn / Bun**: no aportan nada decisivo frente a pnpm para este proyecto.

## Consecuencias

- Instalaciones más rápidas y estrictas: no se puede importar un paquete que no esté declarado.
- Hay que instalar pnpm en cada máquina (`npm install -g pnpm`). Vercel y la CI lo detectan por `packageManager`.
- A veces hay que esperar unos días para usar una versión recién publicada. Si hiciera falta un parche urgente de seguridad, se añade a `minimumReleaseAgeExclude` de forma puntual y documentada.
