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

insert into public.organizations (id, name, contact_email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Pisos Ejemplo Norte', 'privacidad-norte@example.com'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Habitaciones Demo Sur', 'privacidad-sur@example.com');

insert into public.members (org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'staff'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '33333333-3333-4333-8333-333333333333', 'owner');

-- Properties and rooms (milestone 2). Dates are relative to the day of the
-- reset, so the board always shows every state: free, free from a date,
-- freeing up soon, occupied, overdue and unavailable.
insert into public.properties (id, org_id, name, address, city, region, total_rent_reference_cents)
values
  ('a1a1a1a1-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'Piso Calle Ficticia', 'Calle Ficticia 12, 3.º B', 'Madrid', 'ES-MD', 180000),
  ('a1a1a1a1-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'Piso Avenida Inventada', 'Avenida Inventada 7, 1.º', 'Pamplona', 'ES-NC', null),
  ('b1b1b1b1-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'Piso Plaza Imaginaria', 'Plaza Imaginaria 3, 2.º A', 'Sevilla', 'ES-AN', null);

insert into public.rooms (
  org_id, property_id, name, price_cents, deposit_cents, size_m2, features, status, available_from
)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-4000-8000-000000000001',
   'Habitación 1', 45000, 45000, 12.0, '{"exterior": true, "desk": true}', 'vacant', null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-4000-8000-000000000001',
   'Habitación 2', 48000, 48000, 14.5, '{"balcony": true, "double_bed": true}', 'occupied', current_date + 20),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-4000-8000-000000000001',
   'Habitación 3', 42000, 42000, 10.0, '{}', 'occupied', null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-4000-8000-000000000001',
   'Habitación 4', 39000, null, 8.5, '{}', 'unavailable', null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-4000-8000-000000000002',
   'Habitación A', 40000, 80000, 11.0, '{"private_bathroom": true, "bills_included": true}', 'vacant', current_date + 45),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-4000-8000-000000000002',
   'Habitación B', 38000, 76000, 9.0, '{"bills_included": true}', 'occupied', current_date - 3),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1a1a1a1-0000-4000-8000-000000000002',
   'Habitación C', 41000, 82000, 10.5, '{"bills_included": true, "heating": true}', 'occupied', current_date + 90),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b1b1b1b1-0000-4000-8000-000000000001',
   'Habitación Sur 1', 35000, 35000, 10.0, '{"air_conditioning": true}', 'vacant', null),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b1b1b1b1-0000-4000-8000-000000000001',
   'Habitación Sur 2', 36000, 36000, 11.0, '{"air_conditioning": true}', 'occupied', current_date + 10);

-- Public links (milestone 3). Fixed tokens for two rooms, so that the
-- form can be opened at http://localhost:3000/apply/<token>:
--   Habitación 1 (free)         a1000000000000000000000000000001
--   Habitación 4 (unavailable)  a1000000000000000000000000000004
update public.rooms set public_token = 'a1000000000000000000000000000001' -- secret-scan:allow (fictitious seed token)
where property_id = 'a1a1a1a1-0000-4000-8000-000000000001' and name = 'Habitación 1';
update public.rooms set public_token = 'a1000000000000000000000000000004' -- secret-scan:allow (fictitious seed token)
where property_id = 'a1a1a1a1-0000-4000-8000-000000000001' and name = 'Habitación 4';

-- Fictitious applications, through the same function the form uses.
select public.submit_application(
  'a1000000000000000000000000000001', 'lucia@example.net', 'Lucía Ficticia', '600000001',
  jsonb_build_object(
    'move_in_date', current_date + 14, 'stay_months', 9, 'occupation', 'student',
    'schedule', 'morning', 'remote_work', 'sometimes', 'cleanliness', 4, 'noise', 2,
    'visits', 2, 'common_areas', 3, 'smoking', 'no', 'pets', false,
    'introduction', 'Estudio un máster y busco un piso tranquilo.', 'adult_declared', true
  ),
  '2026-10-21', null
);
select public.submit_application(
  'a1000000000000000000000000000001', 'marcos@example.net', 'Marcos Inventado', null,
  jsonb_build_object(
    'move_in_date', current_date + 30, 'stay_months', 12, 'occupation', 'worker',
    'monthly_income', 1900, 'schedule', 'afternoon', 'remote_work', 'mostly',
    'cleanliness', 3, 'noise', 3, 'visits', 3, 'common_areas', 4, 'smoking', 'outside',
    'pets', false, 'adult_declared', true
  ),
  '2026-10-21', null
);
