# 0008 — Pisos y habitaciones: modelo de datos y estados

- Fecha: 2026-10-21
- Estado: aceptada

## Contexto

El Hito 2 da de alta pisos (`properties`) y habitaciones (`rooms`) y muestra un tablero con el estado de cada habitación. El briefing fija los campos principales (sección 8). Mario aprobó: staff crea y edita, solo owner y admin borran; fotos también de zonas comunes; estados «Libre / Ocupada / No disponible» más una fecha; borrado definitivo con confirmación; límites de 100 pisos, 20 habitaciones por piso y 20 fotos por habitación y por zonas comunes.

## Decisión

- **Importes en céntimos** (`integer`: `price_cents`, `deposit_cents`, `total_rent_reference_cents`), como Stripe. Sumar decimales en JavaScript da errores (`0.1 + 0.2 ≠ 0.3`); con enteros, la suma de rentas es exacta. El formulario acepta lo que escribe un operador en España («450», «450,50», «1.200») y `src/lib/numbers.ts` lo convierte sin pasar por coma flotante. Máximo 99.999,99 € en la base de datos y en Zod.
- **Claves foráneas compuestas.** `rooms (org_id, property_id) → properties (org_id, id)` y, en las fotos, `(org_id, property_id) → properties` y `(property_id, room_id) → rooms`. Las claves foráneas se comprueban sin pasar por RLS: sin ellas, un miembro podría crear desde la API una habitación de su organización colgada de un piso de otra. Así la base de datos lo impide. Una habitación no cambia de piso ni de organización (permisos por columna).
- **Escrituras directas por la API con RLS**, sin RPC: cada alta, edición o borrado es una sola fila. En el Hito 1 hicieron falta RPC porque crear una organización toca dos tablas a la vez.
- **Se guarda lo que decide el operador; el estado del tablero se calcula.** `rooms.status` (`vacant`, `occupied`, `unavailable`) más `available_from` (el día en que la habitación queda libre para un nuevo inquilino). `getBoardState()` (`src/lib/rooms/board-state.ts`, función pura con tests) deriva lo que se muestra a partir de ambos y de la fecha de hoy en España:

  | `status`      | `available_from` | Tablero                                     | Grupo          |
  | ------------- | ---------------- | ------------------------------------------- | -------------- |
  | `vacant`      | vacía o ≤ hoy    | Libre                                       | Libres         |
  | `vacant`      | futura           | Libre desde el X                            | Libres         |
  | `occupied`    | vacía            | Ocupada                                     | Ocupadas       |
  | `occupied`    | hoy o futura     | Se libera el X (pronto si faltan ≤ 30 días) | Pronto / Ocup. |
  | `occupied`    | pasada           | Revisar: debía liberarse el X               | Pronto         |
  | `unavailable` | —                | No disponible                               | No disponibles |

  Así no hace falta ningún proceso nocturno que cambie estados. En el Hito 4, aceptar una candidatura actualizará `status` y `available_from`.

- **«Hoy» es la fecha de Madrid** (`todayInSpain()`), no la del servidor (UTC). Las fechas sin hora se formatean en UTC para que el día no se desplace.
- **Características con lista de permitidos** (`src/lib/rooms/features.ts`): baño privado, balcón, exterior, amueblada, cama doble, escritorio, aire acondicionado, calefacción y gastos incluidos. La base de datos solo exige que `features` sea un objeto de booleanos; las claves las decide la app. Se guardan solo las que aplican (`{"balcony": true}`).
- **Comunidad autónoma con códigos ISO 3166-2:ES** (enum `spanish_region`, de `ES-AN` a `ES-VC`). Los nombres están en `es.json`.
- **Nombres únicos**: un piso por nombre en cada organización y una habitación por nombre en cada piso.
- **Permisos** (RLS con los ayudantes del Hito 1): todos los miembros leen, crean y editan; solo owner y admin borran pisos y habitaciones (`canDeletePropertiesAndRooms`). El borrado es definitivo y arrastra en cascada habitaciones y fotos.
- **Límites contra abusos** en un trigger (`check_inventory_limits`), con los números aprobados. No son exactos con inserciones simultáneas, lo cual es suficiente para su propósito.
- **Las consultas filtran por la organización activa** (`src/lib/rooms/queries.ts`): RLS deja leer todas las organizaciones del usuario, pero la app muestra una cada vez.

## Alternativas descartadas

- **`numeric` para el dinero**: llega a TypeScript como `number` y no evita los errores de coma flotante.
- **Un trigger que compruebe la organización del piso** en vez de la clave compuesta: más código para lo mismo.
- **Guardar el estado calculado** y actualizarlo con `pg_cron` cada noche: más piezas y un estado que puede quedarse desfasado.
- **Archivar en vez de borrar**: Mario prefirió borrado definitivo con confirmación.
- **Avisos legales sobre la suma de rentas** (como la ley de Navarra): necesitan revisión de un abogado. Por ahora solo se muestra la suma junto a la renta de referencia.

## Consecuencias

- Desde el Hito 3, cuando haya candidaturas, una habitación con candidaturas no se podrá borrar: solo marcar como no disponible (claves foráneas con `restrict`).
- `public_token` (Hito 3) e `inbound_alias` (Hito 5) se añadirán con su propia migración.
- Las características del piso (ascensor, wifi…) se valorarán en el Hito 6, con el paquete de anuncio.
- El umbral de «se libera pronto» (30 días) es una constante; se podrá configurar por organización cuando lleguen los avisos.
