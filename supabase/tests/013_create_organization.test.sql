begin;
\ir _helpers.psql

select plan(7);
select tests.two_orgs();

select tests.authenticate_as_anon();
select throws_ok(
  $$select public.create_organization('Anon org')$$,
  '42501', null,
  'anon cannot create organizations'
);

select tests.authenticate_as('frank@example.org');
select isnt(
  public.create_organization('  Pisos de Frank  '),
  null,
  'a signed-in user creates an organization'
);
select results_eq(
  $$select o.name, m.role from public.organizations o join public.members m on m.org_id = o.id$$,
  $$values ('Pisos de Frank', 'owner'::public.member_role)$$,
  'the creator is its owner and the name is trimmed'
);

select throws_ok(
  $$select public.create_organization('   ')$$,
  '23514', null,
  'a blank name is rejected'
);

-- The new organization is invisible to everybody else.
select tests.authenticate_as('carla@example.org');
select results_eq(
  $$select name from public.organizations$$,
  array['Org B'],
  'carla does not see the new organization'
);

-- Abuse guard: 10 owned organizations at most.
select tests.authenticate_as('frank@example.org');
select lives_ok(
  $$select public.create_organization('Org ' || n) from generate_series(2, 10) n$$,
  'up to 10 owned organizations are allowed'
);
select throws_ok(
  $$select public.create_organization('One too many')$$,
  'P0001', 'organization_limit',
  'the 11th owned organization is refused'
);

select * from finish();
rollback;
