begin;
\ir _helpers.psql

select plan(22);
select tests.two_orgs();
select tests.create_property('Org A', 'Piso A1');
select tests.create_property('Org A', 'Piso A2');
select tests.create_property('Org B', 'Piso B1');
select tests.create_room('Piso A1', 'Hab A1-1');
select tests.create_room('Piso B1', 'Hab B1-1');

select tests.authenticate_as_anon();
select throws_ok(
  $$select * from public.rooms$$,
  '42501', null,
  'anon cannot read rooms'
);

-- Isolation.
select tests.authenticate_as('ana@example.org');
select results_eq(
  $$select name from public.rooms$$,
  array['Hab A1-1'],
  'ana (Org A) sees only the rooms of Org A'
);

select tests.authenticate_as('carla@example.org');
select results_eq(
  $$select name from public.rooms$$,
  array['Hab B1-1'],
  'carla (Org B) sees only the rooms of Org B'
);

-- Every member creates and edits.
select tests.authenticate_as('bruno@example.org');
select results_eq(
  $$insert into public.rooms (org_id, property_id, name, price_cents, deposit_cents, size_m2, features, status, available_from)
    values (tests.org_id('Org A'), tests.property_id('Piso A1'), 'Hab A1-2', 52050, 52050, 11.5,
            '{"balcony": true, "private_bathroom": false}', 'occupied', '2026-12-01')
    returning name$$,
  array['Hab A1-2'],
  'staff creates a room in a property of their organization'
);

-- The composite foreign key keeps a room in the organization of its property.
select throws_ok(
  $$insert into public.rooms (org_id, property_id, name, price_cents)
    values (tests.org_id('Org A'), tests.property_id('Piso B1'), 'Colada', 40000)$$,
  '23503', null,
  'a room cannot belong to a property of another organization'
);

select throws_ok(
  $$insert into public.rooms (org_id, property_id, name, price_cents)
    values (tests.org_id('Org B'), tests.property_id('Piso B1'), 'Intrusa', 40000)$$,
  '42501', null,
  'nobody creates a room in another organization'
);

select results_eq(
  $$update public.rooms set status = 'vacant', available_from = null
    where name = 'Hab A1-2' returning status::text$$,
  array['vacant'],
  'staff changes the status of a room'
);

select tests.authenticate_as('carla@example.org');
select is_empty(
  $$update public.rooms set price_cents = 1 where name = 'Hab A1-1' returning id$$,
  'carla cannot edit a room of Org A'
);

select tests.authenticate_as('bruno@example.org');
select is_empty(
  $$delete from public.rooms where name = 'Hab A1-2' returning id$$,
  'staff cannot delete a room'
);

select tests.authenticate_as('diego@example.org');
select results_eq(
  $$delete from public.rooms where name = 'Hab A1-2' returning name$$,
  array['Hab A1-2'],
  'an admin deletes a room'
);

-- Only the editable columns are writable.
select tests.authenticate_as('ana@example.org');
select throws_ok(
  $$update public.rooms set property_id = tests.property_id('Piso A2') where name = 'Hab A1-1'$$,
  '42501', null,
  'a room never moves to another property'
);
select throws_ok(
  $$update public.rooms set org_id = tests.org_id('Org B') where name = 'Hab A1-1'$$,
  '42501', null,
  'a room never moves to another organization'
);

-- Constraints.
select throws_ok(
  $$insert into public.rooms (org_id, property_id, name, price_cents)
    values (tests.org_id('Org A'), tests.property_id('Piso A1'), 'Hab A1-1', 40000)$$,
  '23505', null,
  'room names are unique within a property'
);
select lives_ok(
  $$insert into public.rooms (org_id, property_id, name, price_cents)
    values (tests.org_id('Org A'), tests.property_id('Piso A2'), 'Hab A1-1', 40000)$$,
  'another property can use the same room name'
);
select throws_ok(
  $$update public.rooms set price_cents = 0 where name = 'Hab A1-1'$$,
  '23514', null,
  'the price must be positive'
);
select throws_ok(
  $$update public.rooms set size_m2 = 0 where name = 'Hab A1-1'$$,
  '23514', null,
  'the size must be positive'
);
select throws_ok(
  $$update public.rooms set features = '{"balcony": "yes"}' where name = 'Hab A1-1'$$,
  '23514', null,
  'features only hold booleans'
);
select throws_ok(
  $$update public.rooms set features = '["balcony"]' where name = 'Hab A1-1'$$,
  '23514', null,
  'features is an object'
);
select throws_ok(
  $$update public.rooms set status = 'reserved' where name = 'Hab A1-1'$$,
  '22P02', null,
  'the status is one of the known values'
);

-- Deleting a property deletes its rooms.
select tests.as_admin();
delete from public.properties where name = 'Piso A2';
select results_eq(
  $$select name from public.rooms where org_id = tests.org_id('Org A')$$,
  array['Hab A1-1'],
  'deleting a property deletes its rooms'
);

-- Abuse guard: 20 rooms per property.
insert into public.rooms (org_id, property_id, name, price_cents)
select tests.org_id('Org A'), tests.property_id('Piso A1'), 'Relleno ' || n, 40000
from generate_series(1, 19) n;

select tests.authenticate_as('ana@example.org');
select throws_ok(
  $$insert into public.rooms (org_id, property_id, name, price_cents)
    values (tests.org_id('Org A'), tests.property_id('Piso A1'), 'Una de más', 40000)$$,
  'P0001', 'room_limit',
  'a property cannot have more than 20 rooms'
);

select tests.as_admin();
update public.rooms set updated_at = '2000-01-01' where name = 'Hab A1-1';
select results_eq(
  $$select updated_at = now() from public.rooms where name = 'Hab A1-1'$$,
  array[true],
  'updated_at is set by the database on every update'
);

select * from finish();
rollback;
