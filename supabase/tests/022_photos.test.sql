begin;
\ir _helpers.psql

select plan(17);
select tests.two_orgs();
select tests.create_property('Org A', 'Piso A1');
select tests.create_property('Org A', 'Piso A2');
select tests.create_property('Org B', 'Piso B1');
select tests.create_room('Piso A1', 'Hab A1-1');
select tests.create_room('Piso A2', 'Hab A2-1');

-- Rows of the photos table only: the files themselves are tested in
-- 023_storage.test.sql.
-- Queries as postgres filter by the test organizations: the database may
-- hold other photos (the hosted project, with --linked, has real ones).

select tests.authenticate_as_anon();
select throws_ok(
  $$select * from public.photos$$,
  '42501', null,
  'anon cannot read photos'
);

-- Any member adds photos of a room or of the common areas.
select tests.authenticate_as('bruno@example.org');
select lives_ok(
  $$insert into public.photos (org_id, property_id, room_id, storage_path, width, height)
    values (tests.org_id('Org A'), tests.property_id('Piso A1'), tests.room_id('Hab A1-1'),
            tests.photo_path('Piso A1'), 2048, 1536)$$,
  'staff adds a photo of a room'
);
select lives_ok(
  $$insert into public.photos (org_id, property_id, room_id, storage_path, width, height)
    values (tests.org_id('Org A'), tests.property_id('Piso A1'), null,
            tests.photo_path('Piso A1'), 1536, 2048)$$,
  'staff adds a photo of the common areas'
);

select throws_ok(
  $$insert into public.photos (org_id, property_id, room_id, storage_path, width, height)
    values (tests.org_id('Org A'), tests.property_id('Piso A1'), tests.room_id('Hab A2-1'),
            tests.photo_path('Piso A1'), 100, 100)$$,
  '23503', null,
  'a photo cannot point to a room of another property'
);
select throws_ok(
  $$insert into public.photos (org_id, property_id, storage_path, width, height)
    values (tests.org_id('Org A'), tests.property_id('Piso B1'),
            tests.org_id('Org A')::text || '/' || tests.property_id('Piso B1')::text || '/'
              || gen_random_uuid()::text || '.jpg',
            100, 100)$$,
  '23503', null,
  'a photo cannot point to a property of another organization'
);
select throws_ok(
  $$insert into public.photos (org_id, property_id, storage_path, width, height)
    values (tests.org_id('Org B'), tests.property_id('Piso B1'), tests.photo_path('Piso B1'), 100, 100)$$,
  '42501', null,
  'nobody adds photos to another organization'
);

-- The object name must sit in the folder of its organization and property.
select throws_ok(
  $$insert into public.photos (org_id, property_id, storage_path, width, height)
    values (tests.org_id('Org A'), tests.property_id('Piso A1'), tests.photo_path('Piso A2'), 100, 100)$$,
  '23514', null,
  'the storage path must be in the folder of the property'
);
select throws_ok(
  $$insert into public.photos (org_id, property_id, storage_path, width, height)
    values (tests.org_id('Org A'), tests.property_id('Piso A1'),
            tests.org_id('Org A')::text || '/' || tests.property_id('Piso A1')::text || '/../x.jpg', 100, 100)$$,
  '23514', null,
  'the storage path has a fixed shape'
);
select throws_ok(
  $$insert into public.photos (org_id, property_id, storage_path, width, height)
    values (tests.org_id('Org A'), tests.property_id('Piso A1'), tests.photo_path('Piso A1'), 5000, 100)$$,
  '23514', null,
  'dimensions are bounded'
);

-- Isolation.
select tests.authenticate_as('carla@example.org');
select is_empty(
  $$select * from public.photos$$,
  'carla (Org B) sees no photos of Org A'
);
select is_empty(
  $$delete from public.photos returning id$$,
  'carla cannot delete photos of Org A'
);

select tests.authenticate_as('ana@example.org');
select results_eq(
  $$select count(*)::int from public.photos$$,
  array[2],
  'ana (Org A) sees the photos of Org A'
);
select throws_ok(
  $$update public.photos set width = 10$$,
  '42501', null,
  'photos are never updated'
);

-- Staff can remove photos (unlike properties and rooms).
select tests.authenticate_as('bruno@example.org');
select results_eq(
  $$delete from public.photos where room_id is null returning width$$,
  array[1536],
  'staff deletes a photo'
);

-- Deleting a room deletes its photos, not the property's.
select tests.as_admin();
insert into public.photos (org_id, property_id, storage_path, width, height)
values (tests.org_id('Org A'), tests.property_id('Piso A1'), tests.photo_path('Piso A1'), 800, 600);
delete from public.rooms where org_id = tests.org_id('Org A') and name = 'Hab A1-1';
select results_eq(
  $$select room_id is null, width from public.photos
    where org_id = tests.org_id('Org A')$$,
  $$values (true, 800)$$,
  'deleting a room deletes its photos and keeps the common areas'''
);

-- Abuse guard: 20 photos per room and 20 of the common areas, separately.
insert into public.photos (org_id, property_id, storage_path, width, height)
select tests.org_id('Org A'), tests.property_id('Piso A1'), tests.photo_path('Piso A1'), 800, 600
from generate_series(1, 19);
insert into public.photos (org_id, property_id, room_id, storage_path, width, height)
select tests.org_id('Org A'), tests.property_id('Piso A2'), tests.room_id('Hab A2-1'),
       tests.photo_path('Piso A2'), 800, 600
from generate_series(1, 20);

select tests.authenticate_as('ana@example.org');
select throws_ok(
  $$insert into public.photos (org_id, property_id, storage_path, width, height)
    values (tests.org_id('Org A'), tests.property_id('Piso A1'), tests.photo_path('Piso A1'), 800, 600)$$,
  'P0001', 'photo_limit',
  'a property cannot have more than 20 photos of the common areas'
);
select throws_ok(
  $$insert into public.photos (org_id, property_id, room_id, storage_path, width, height)
    values (tests.org_id('Org A'), tests.property_id('Piso A2'), tests.room_id('Hab A2-1'),
            tests.photo_path('Piso A2'), 800, 600)$$,
  'P0001', 'photo_limit',
  'a room cannot have more than 20 photos'
);

select * from finish();
rollback;
