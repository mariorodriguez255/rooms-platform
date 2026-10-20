-- Local development seed data. Loaded by `pnpm db:reset`.
-- Always fictitious data: never real people, emails or addresses.
-- Never pushed to the hosted project (`supabase db push` skips it).
--
-- Users (all with the password `rooms-demo-2026`, see README):
--   ana@example.com    owner of «Pisos Ejemplo Norte»
--   bruno@example.com  staff of «Pisos Ejemplo Norte»
--   carla@example.com  owner of «Habitaciones Demo Sur»

-- GoTrue reads these token columns as strings, so they must be '' and not
-- null, or signing in fails.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  u.id,
  'authenticated',
  'authenticated',
  u.email,
  extensions.crypt('rooms-demo-2026', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  jsonb_build_object('full_name', u.full_name),
  now(),
  now(),
  '', '', '', ''
from (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid, 'ana@example.com', 'Ana Ejemplo'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'bruno@example.com', 'Bruno Prueba'),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'carla@example.com', 'Carla Demo')
) as u (id, email, full_name);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(),
  now(),
  now()
from auth.users u;

insert into public.organizations (id, name)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Pisos Ejemplo Norte'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Habitaciones Demo Sur');

insert into public.members (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'staff'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '33333333-3333-4333-8333-333333333333', 'owner');
