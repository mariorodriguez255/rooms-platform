begin;
\ir _helpers.psql

select plan(24);
select tests.two_orgs();

-- A role lookup that ignores RLS, to check that denied writes changed nothing.
create function tests.role_of(member_email text, org_name text)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.members m
  where m.user_id = tests.user_id(member_email) and m.org_id = tests.org_id(org_name);
$$;
grant execute on function tests.role_of(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Reading
-- ---------------------------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok(
  $$select * from public.members$$,
  '42501', null,
  'anon cannot read members'
);

select tests.authenticate_as('ana@example.org');
select results_eq(
  $$select count(*) from public.members$$,
  array[3::bigint],
  'ana sees the 3 members of Org A'
);

select tests.authenticate_as('carla@example.org');
select results_eq(
  $$select m.org_id from public.members m$$,
  array[tests.org_id('Org B')],
  'carla sees only the members of Org B'
);

-- ---------------------------------------------------------------------
-- Another organization
-- ---------------------------------------------------------------------
select is_empty(
  $$update public.members set role = 'staff' where org_id = tests.org_id('Org A') returning id$$,
  'carla cannot change roles in Org A'
);
select is_empty(
  $$delete from public.members where org_id = tests.org_id('Org A') returning id$$,
  'carla cannot remove members of Org A'
);
select throws_ok(
  $$insert into public.members (org_id, user_id, role)
    values (tests.org_id('Org A'), tests.user_id('carla@example.org'), 'owner')$$,
  '42501', null,
  'carla cannot add herself to Org A'
);
select results_eq(
  $$select tests.role_of('ana@example.org', 'Org A')$$,
  array['owner'::public.member_role],
  'Org A is intact after carla''s attempts'
);

-- ---------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------
select tests.authenticate_as('bruno@example.org');
select is_empty(
  $$update public.members set role = 'admin' returning id$$,
  'staff cannot change roles (not even their own)'
);
select is_empty(
  $$delete from public.members where user_id = tests.user_id('diego@example.org') returning id$$,
  'staff cannot remove other members'
);
select results_eq(
  $$select tests.role_of('bruno@example.org', 'Org A')$$,
  array['staff'::public.member_role],
  'the denied writes left bruno as staff'
);

-- ---------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------
select tests.authenticate_as('diego@example.org');
select throws_ok(
  $$update public.members set role = 'owner' where user_id = tests.user_id('bruno@example.org')$$,
  '42501', 'insufficient_role',
  'an admin cannot make someone an owner'
);
select throws_ok(
  $$update public.members set role = 'admin' where user_id = tests.user_id('ana@example.org')$$,
  '42501', 'insufficient_role',
  'an admin cannot demote an owner'
);
select throws_ok(
  $$delete from public.members where user_id = tests.user_id('ana@example.org')$$,
  '42501', 'insufficient_role',
  'an admin cannot remove an owner'
);
select results_eq(
  $$update public.members set role = 'admin'
    where user_id = tests.user_id('bruno@example.org') returning role$$,
  array['admin'::public.member_role],
  'an admin promotes staff to admin'
);
select results_eq(
  $$update public.members set role = 'staff'
    where user_id = tests.user_id('bruno@example.org') returning role$$,
  array['staff'::public.member_role],
  'an admin demotes an admin to staff'
);
select throws_ok(
  $$update public.members set user_id = tests.user_id('carla@example.org')
    where user_id = tests.user_id('bruno@example.org')$$,
  '42501', null,
  'only the role column is writable'
);

-- ---------------------------------------------------------------------
-- Owner and the last-owner rule
-- ---------------------------------------------------------------------
select tests.authenticate_as('ana@example.org');
select throws_ok(
  $$update public.members set role = 'admin' where user_id = tests.user_id('ana@example.org')$$,
  'P0001', 'last_owner',
  'the only owner cannot demote themselves'
);
select throws_ok(
  $$delete from public.members where user_id = tests.user_id('ana@example.org')$$,
  'P0001', 'last_owner',
  'the only owner cannot leave'
);

-- Handing over ownership: promote someone else, then step down.
select results_eq(
  $$update public.members set role = 'owner'
    where user_id = tests.user_id('diego@example.org') returning role$$,
  array['owner'::public.member_role],
  'an owner makes another member an owner'
);
select results_eq(
  $$update public.members set role = 'admin'
    where user_id = tests.user_id('ana@example.org') returning role$$,
  array['admin'::public.member_role],
  'with another owner, an owner can step down'
);

-- ---------------------------------------------------------------------
-- Leaving and removing
-- ---------------------------------------------------------------------
select tests.authenticate_as('bruno@example.org');
select results_eq(
  $$delete from public.members where user_id = tests.user_id('bruno@example.org') returning role$$,
  array['staff'::public.member_role],
  'a member can leave the organization'
);
select is_empty(
  $$select * from public.organizations$$,
  'after leaving, bruno no longer sees Org A'
);

select tests.authenticate_as('ana@example.org');
select results_eq(
  $$delete from public.members where user_id = tests.user_id('ana@example.org') returning role$$,
  array['admin'::public.member_role],
  'an admin can leave'
);

-- Deleting an organization must cascade even though it removes the last
-- owner. Simulates what a milestone 7 security definer function will do:
-- privileged role, but with the owner's session (auth.uid() is set).
select tests.as_admin();
select set_config(
  'request.jwt.claims',
  json_build_object('sub', tests.user_id('carla@example.org'))::text,
  true
);
select lives_ok(
  $$delete from public.organizations where id = tests.org_id('Org B')$$,
  'deleting an organization cascades to its members'
);

select * from finish();
rollback;
