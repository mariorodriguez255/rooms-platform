# 0005 — Modelo multi-tenant: organizaciones, miembros y RLS

- Fecha: 2026-10-20
- Estado: aceptada

## Contexto

Cada operador es una organización (_tenant_). El briefing exige `org_id` en toda tabla de negocio y que RLS solo deje ver filas de las organizaciones de las que el usuario es miembro. Roles aprobados por Mario: `owner`, `admin` y `staff`.

## Decisión

- **Tablas:** `organizations`, `members` (`org_id`, `user_id`, `role`), `profiles` (nombre y email de cada usuario, sincronizados desde `auth.users` por triggers) e `invitations`.
- **Ayudantes de RLS en un esquema `private`**, que PostgREST no publica: `is_member`, `has_role` y `shares_org`. Son `security definer` y con `search_path` fijo. Así se evita la recursión infinita de una política de `members` que consulte `members`, y `(select auth.uid())` se evalúa una vez por consulta.
- **Escrituras compuestas solo por funciones RPC:** `create_organization` (crea la organización y su owner), `create_invitation`, `get_invitation` y `accept_invitation`. Ni `organizations`, ni `members`, ni `invitations` admiten `insert` desde la API.
- **Permisos por columna:** aunque una política lo permita, solo se puede escribir `organizations.name`, `members.role`, `profiles.full_name` e `invitations.revoked_at`.
- **Reglas de roles que una política no puede expresar**, en un trigger (`guard_member_change`): solo un owner toca a otro owner o asciende a owner, y una organización nunca se queda sin owner. Ceder la propiedad es ascender a otro miembro y después bajarse de rol.
- **`anon` sin ningún privilegio** sobre las tablas y funciones nuevas del esquema `public`. Se revocan los privilegios por defecto que da Supabase. El formulario público del Hito 3 pasará por una función de servidor.
- **Invitaciones por enlace:** el admin genera un enlace y lo envía él. El token tiene 256 bits, en la base de datos solo se guarda su SHA-256 y solo se muestra una vez. Caduca a los 7 días y solo lo puede aceptar el usuario cuyo **email confirmado** coincide con el invitado. Volver a invitar el mismo email anula el enlace anterior.
- **Invariantes comprobados por tests sobre el catálogo** (`supabase/tests/001_schema_invariants.test.sql`): RLS en todas las tablas; `org_id NOT NULL` con índice en todas, salvo la lista de permitidos (`organizations`, `profiles`); índice en cada clave foránea; ningún privilegio para `anon`; `search_path` fijo en toda función `security definer`.

### Excepción: `profiles` sin `org_id`

Son datos de identidad, no de negocio: una persona puede estar en varias organizaciones y tiene un único nombre. RLS la deja ver solo a uno mismo y a quienes comparten alguna organización con él.

## Alternativas descartadas

- **Leer emails de `auth.users` con una función** en vez de tener `profiles`: no permite consultas normales ni embeber el nombre en un `select` de `members`.
- **Invitaciones por email automático** (Supabase `inviteUserByEmail` o Resend/Postmark): adelantaría la elección del proveedor de email saliente, prevista para el Hito 3. El email automático se podrá añadir sobre el mismo modelo.

## Consecuencias

- Cada tabla nueva necesita su política, su índice en `org_id` y su test de aislamiento. Si falta alguno, el test de invariantes falla.
- Borrar un usuario que es el único owner deja su organización sin owner. Se resolverá con el borrado de cuentas (Hito 7).
- Máximo de 10 organizaciones propias por usuario y de 50 invitaciones abiertas por organización, como protección contra abusos.
