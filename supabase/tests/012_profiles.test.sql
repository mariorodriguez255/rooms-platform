begin;
\ir _helpers.psql

select plan(13);
select tests.two_orgs();

-- ---------------------------------------------------------------------
-- Signup and email-change triggers
-- ---------------------------------------------------------------------
insert into auth.users (id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated',
   'Mixed.Case@Example.org', '{"full_name": "  Padded Name  "}'),
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated',
   'blank@example.org', '{"full_name": "   "}'),
  ('00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated',
   'long@example.org', jsonb_build_object('full_name', repeat('x', 300)));

select results_eq(
  $$select email, full_name from public.profiles
    where user_id = '00000000-0000-0000-0000-0000000000a1'$$,
  $$values ('mixed.case@example.org', 'Padded Name')$$,
  'signup creates the profile with a lower-cased email and a trimmed name'
);
select results_eq(
  $$select full_name from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a2'$$,
  array[null::text],
  'a blank name is stored as null'
);
select results_eq(
  $$select char_length(full_name) from public.profiles
    where user_id = '00000000-0000-0000-0000-0000000000a3'$$,
  array[100],
  'an overlong name is truncated instead of blocking the signup'
);

update auth.users set email = 'New.Address@example.org'
where id = '00000000-0000-0000-0000-0000000000a1';
select results_eq(
  $$select email from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a1'$$,
  array['new.address@example.org'],
  'a confirmed email change is copied to the profile'
);

-- ---------------------------------------------------------------------
-- Reading: yourself and your co-members only
-- ---------------------------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok(
  $$select * from public.profiles$$,
  '42501', null,
  'anon cannot read profiles'
);

select tests.authenticate_as('ana@example.org');
select results_eq(
  $$select email from public.profiles order by email$$,
  array['ana@example.org', 'bruno@example.org', 'diego@example.org'],
  'ana sees her own profile and those of Org A members'
);

select tests.authenticate_as('carla@example.org');
select results_eq(
  $$select email from public.profiles$$,
  array['carla@example.org'],
  'carla (Org B) sees no profile from Org A'
);

select tests.authenticate_as('frank@example.org');
select results_eq(
  $$select email from public.profiles$$,
  array['frank@example.org'],
  'a user without organizations sees only their own profile'
);

-- ---------------------------------------------------------------------
-- Writing: own name only
-- ---------------------------------------------------------------------
select tests.authenticate_as('carla@example.org');
select is_empty(
  $$update public.profiles set full_name = 'Hacked'
    where user_id = tests.user_id('ana@example.org') returning user_id$$,
  'carla cannot rename ana'
);

select tests.authenticate_as('diego@example.org');
select is_empty(
  $$update public.profiles set full_name = 'Renamed by admin'
    where user_id = tests.user_id('ana@example.org') returning user_id$$,
  'not even a co-member admin can rename someone else'
);

select tests.authenticate_as('ana@example.org');
select results_eq(
  $$update public.profiles set full_name = 'Ana Renamed'
    where user_id = tests.user_id('ana@example.org') returning full_name$$,
  array['Ana Renamed'],
  'a user renames themselves'
);
select throws_ok(
  $$update public.profiles set email = 'spoof@example.org'
    where user_id = tests.user_id('ana@example.org')$$,
  '42501', null,
  'the email is not writable (it follows auth.users)'
);
select throws_ok(
  $$delete from public.profiles where user_id = tests.user_id('ana@example.org')$$,
  '42501', null,
  'profiles cannot be deleted through the API'
);

select * from finish();
rollback;
