# 0003 — Alojamiento en la UE: Frankfurt

- Fecha: 2026-10-20
- Estado: aceptada (actualizada en el Hito 1)

## Contexto

El RGPD y el briefing exigen que los datos estén en la UE. Vercel ejecuta las funciones por defecto en `iad1` (Washington, D.C.). El plan Hobby de Vercel solo permite una región.

## Decisión

- **Vercel**: `regions: ["fra1"]` (Frankfurt) en `vercel.json`.
- **Supabase** (Hito 1): crear el proyecto en `eu-central-1` (Frankfurt), en la misma ciudad que las funciones para minimizar la latencia entre servidor y base de datos.

## Alternativas descartadas

- **Otras regiones de la UE** (París, Irlanda): válidas, pero separar funciones y base de datos añade latencia en cada consulta.
- **Londres y Zúrich**: no están en la UE.

## Consecuencias

- Toda la ejecución en servidor y los datos quedan en Alemania.
- El **build** de Vercel se ejecuta en `iad1` aunque las funciones estén en `fra1`: `regions` controla dónde se ejecutan las funciones, no dónde se compila. El build solo procesa código (nunca datos personales), así que no afecta al RGPD.
- **Routing Middleware (`src/proxy.ts`) fuera de `fra1`.** Según la documentación de Vercel, se despliega «en todas las regiones por defecto, independientemente de la configuración de región» (en Hobby, en menos regiones), y no hay forma de fijarlo a una región. Comprobado en el Hito 1. Lo que procesa: la cookie de sesión de Supabase (identificador de usuario y email dentro del JWT) y, cuando caduca el token, la llamada a Supabase Auth para refrescarlo. Ningún dato de negocio ni de candidatos pasa por ahí: se cargan en las funciones de `fra1`. Antes del piloto (Hito 7) hay que confirmar que esto está cubierto por el DPA de Vercel o reducirlo (por ejemplo, que el proxy solo compruebe si existe la cookie y que el refresco se haga en `fra1`).
- El plan Hobby es solo para uso no comercial: pasar a Pro antes de que entre el primer operador piloto (Hito 7).
