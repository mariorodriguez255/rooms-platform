begin;
\ir _helpers.psql

select plan(13);
select tests.two_orgs();

-- Visitors without a session hold no grant at all.
select tests.authenticate_as_anon();
select throws_ok(
  $$select * from public.organizations$$,
  '42501', null,
  'anon cannot read organizations'
);

-- Isolation: each member sees only their own organization.
select tests.authenticate_as('ana@example.org');
select results_eq(
  $$select name from public.organizations$$,
  array['Org A'],
  'ana (Org A) sees only Org A'
);

select tests.authenticate_as('carla@example.org');
select results_eq(
  $$select name from public.organizations$$,
  array['Org B'],
  'carla (Org B) sees only Org B'
);

select tests.authenticate_as('frank@example.org');
select is_empty(
  $$select * from public.organizations$$,
  'a user without organizations sees none'
);

-- Writes from another organization are filtered out by the policy.
select tests.authenticate_as('carla@example.org');
select is_empty(
  $$update public.organizations set name = 'Hacked' where name = 'Org A' returning id$$,
  'carla cannot rename Org A'
);

-- Roles inside the organization.
select tests.authenticate_as('bruno@example.org');
select is_empty(
  $$update public.organizations set name = 'Renamed by staff' returning id$$,
  'staff cannot rename their organization'
);

select tests.as_admin();
select results_eq(
  $$select name from public.organizations where id = tests.org_id('Org A')$$,
  array['Org A'],
  'the denied renames left Org A intact'
);

select tests.authenticate_as('diego@example.org');
select results_eq(
  $$update public.organizations set name = 'Org A renamed' returning name$$,
  array['Org A renamed'],
  'an admin renames their organization'
);

select tests.authenticate_as('ana@example.org');
select results_eq(
  $$update public.organizations set name = 'Org A' returning name$$,
  array['Org A'],
  'the owner renames their organization'
);

select throws_ok(
  $$update public.organizations set name = '   '$$,
  '23514', null,
  'a blank name is rejected'
);

-- Only the name column is writable, and rows are created and deleted
-- only through functions.
select throws_ok(
  $$update public.organizations set created_at = now()$$,
  '42501', null,
  'other columns are not writable'
);

select throws_ok(
  $$insert into public.organizations (name) values ('Direct insert')$$,
  '42501', null,
  'organizations cannot be inserted directly'
);

select throws_ok(
  $$delete from public.organizations$$,
  '42501', null,
  'organizations cannot be deleted through the API'
);

select * from finish();
rollback;
