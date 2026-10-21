begin;
\ir _helpers.psql

-- Milestone 3: the functions behind the public application form, which only
-- the app's server (service_role) can call, and the tables they fill.
-- Queries as postgres filter by the test organizations: the development
-- seed has applications of its own.

select plan(34);
select tests.two_orgs();
select tests.create_property('Org A', 'Piso A1');
select tests.create_property('Org B', 'Piso B1');
select tests.create_room('Piso A1', 'Hab A1');
select tests.create_room('Piso A1', 'Hab A2');
select tests.create_room('Piso A1', 'Hab A3');
select tests.create_room('Piso B1', 'Hab B1');
update public.rooms set status = 'unavailable' where name = 'Hab A2';
-- Org A can receive applications; Org B has no contact email yet.
update public.organizations set contact_email = 'privacidad@example.org' where name = 'Org A';
select set_config('tests.ip', repeat('a', 64), true);

-- ---------------------------------------------------------------------
-- Who can call the public functions
-- ---------------------------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok(
  $$select * from public.get_public_room(tests.room_token('Hab A1'))$$,
  '42501', null,
  'anon cannot read a room through the public function'
);
select throws_ok(
  $$select * from public.submit_application(tests.room_token('Hab A1'), 'x@example.org', 'X', null, tests.answers(), 'v1', null)$$,
  '42501', null,
  'anon cannot submit an application directly'
);

select tests.authenticate_as('ana@example.org');
select throws_ok(
  $$select * from public.get_public_room(tests.room_token('Hab A1'))$$,
  '42501', null,
  'signed-in users cannot call the public functions either'
);
select throws_ok(
  $$select * from public.submit_application(tests.room_token('Hab A1'), 'x@example.org', 'X', null, tests.answers(), 'v1', null)$$,
  '42501', null,
  'signed-in users cannot submit directly'
);

-- ---------------------------------------------------------------------
-- The public page
-- ---------------------------------------------------------------------
select tests.as_admin();
insert into public.photos (org_id, property_id, room_id, storage_path, width, height)
values
  (tests.org_id('Org A'), tests.property_id('Piso A1'), null, tests.photo_path('Piso A1'), 10, 10),
  (tests.org_id('Org A'), tests.property_id('Piso A1'), tests.room_id('Hab A1'), tests.photo_path('Piso A1'), 20, 20),
  (tests.org_id('Org A'), tests.property_id('Piso A1'), tests.room_id('Hab A3'), tests.photo_path('Piso A1'), 30, 30);

select tests.authenticate_as_service();
select is_empty(
  $$select * from public.get_public_room(repeat('0', 32))$$,
  'an unknown token finds nothing'
);
select results_eq(
  $$select room_name, city, price_cents, org_name, contact_email, accepting
    from public.get_public_room(tests.room_token('Hab A1'))$$,
  $$values ('Hab A1', 'Madrid', 45000, 'Org A', 'privacidad@example.org', true)$$,
  'the page shows the room, its city and who processes the data'
);
select results_eq(
  $$select (select array_agg((p ->> 'width')::int) from jsonb_array_elements(photos) p)
    from public.get_public_room(tests.room_token('Hab A1'))$$,
  $$values (array[20, 10])$$,
  'the room''s photos come first, then the common areas; never other rooms'''
);
select results_eq(
  $$select accepting from public.get_public_room(tests.room_token('Hab A2'))$$,
  array[false],
  'an unavailable room does not accept applications'
);
select results_eq(
  $$select accepting from public.get_public_room(tests.room_token('Hab B1'))$$,
  array[false],
  'without a contact email the organization does not accept applications'
);

-- ---------------------------------------------------------------------
-- Submitting
-- ---------------------------------------------------------------------
select throws_ok(
  $$select * from public.submit_application(repeat('0', 32), 'x@example.org', 'X', null, tests.answers(), 'v1', null)$$,
  'P0001', 'room_not_found',
  'an unknown token is rejected'
);
select throws_ok(
  $$select * from public.submit_application(tests.room_token('Hab A2'), 'x@example.org', 'X', null, tests.answers(), 'v1', null)$$,
  'P0001', 'room_closed',
  'an unavailable room is rejected'
);
select throws_ok(
  $$select * from public.submit_application(tests.room_token('Hab B1'), 'x@example.org', 'X', null, tests.answers(), 'v1', null)$$,
  'P0001', 'room_closed',
  'an organization without contact email is rejected'
);

select results_eq(
  $$select is_new from public.submit_application(
      tests.room_token('Hab A1'), '  Elena@Example.org ', 'Elena Candidata', '600000000',
      tests.answers(), '2026-10-21', current_setting('tests.ip'))$$,
  array[true],
  'a candidate applies'
);

select tests.as_admin();
select results_eq(
  $$select c.email, c.name, c.phone, a.answers ->> 'occupation', r.name
    from public.applications a
    join public.candidates c on c.id = a.candidate_id
    join public.rooms r on r.id = a.room_id
    where a.org_id = tests.org_id('Org A')$$,
  $$values ('elena@example.org', 'Elena Candidata', '600000000', 'worker', 'Hab A1')$$,
  'the candidate (email normalized) and the application are stored'
);
select results_eq(
  $$select purpose::text, text_version, ip_hash, org_id from public.consents
    where org_id = tests.org_id('Org A')$$,
  $$values ('application', '2026-10-21', repeat('a', 64), tests.org_id('Org A'))$$,
  'the consent is recorded with its text version and the IP hash'
);

-- The same person again: answers and contact details are replaced.
select tests.authenticate_as_service();
select results_eq(
  $$select is_new from public.submit_application(
      tests.room_token('Hab A1'), 'elena@example.org', 'Elena C.', null,
      tests.answers('{"occupation": "student"}'), '2026-10-21', current_setting('tests.ip'))$$,
  array[false],
  'applying again to the same room updates the application'
);
select results_eq(
  $$select is_new from public.submit_application(
      tests.room_token('Hab A3'), 'elena@example.org', 'Elena C.', null,
      tests.answers(), '2026-10-21', current_setting('tests.ip'))$$,
  array[true],
  'the same person can apply to another room'
);

select tests.as_admin();
select results_eq(
  $$select (select count(*)::int from public.candidates where org_id = tests.org_id('Org A')),
           (select count(*)::int from public.applications where org_id = tests.org_id('Org A')),
           (select count(*)::int from public.consents where org_id = tests.org_id('Org A')),
           (select name from public.candidates where org_id = tests.org_id('Org A')),
           (select answers ->> 'occupation' from public.applications a
              join public.rooms r on r.id = a.room_id where r.name = 'Hab A1')$$,
  $$values (1, 2, 3, 'Elena C.', 'student')$$,
  'one candidate per email, one application per room, one consent per submission'
);

-- Constraints behind the app's own validation.
select tests.authenticate_as_service();
select throws_ok(
  $$select * from public.submit_application(tests.room_token('Hab A1'), 'f@example.org', 'F', null,
      tests.answers('{"nationality": "x"}'), 'v1', null)$$,
  '23514', null,
  'answers outside the allow-list are rejected'
);
select throws_ok(
  $$select * from public.submit_application(tests.room_token('Hab A1'), 'f@example.org', 'F', null,
      tests.answers(), 'v1', '192.168.1.1')$$,
  '23514', null,
  'a raw IP is never stored: only a hash'
);

-- ---------------------------------------------------------------------
-- Rate limits (only successful submissions count: a rejected one is
-- rolled back with its event)
-- ---------------------------------------------------------------------
-- Elena used this IP 3 times; two more fit in 10 minutes.
select lives_ok(
  $$select * from public.submit_application(tests.room_token('Hab A1'), 'g1@example.org', 'G', null, tests.answers(), 'v1', current_setting('tests.ip'));
    select * from public.submit_application(tests.room_token('Hab A1'), 'g2@example.org', 'G', null, tests.answers(), 'v1', current_setting('tests.ip'))$$,
  'up to 5 submissions per IP in 10 minutes'
);
select throws_ok(
  $$select * from public.submit_application(tests.room_token('Hab A1'), 'g3@example.org', 'G', null, tests.answers(), 'v1', current_setting('tests.ip'))$$,
  'P0001', 'rate_limited',
  'the 6th submission from the same IP is rejected'
);
select lives_ok(
  $$select * from public.submit_application(tests.room_token('Hab A1'), 'g3@example.org', 'G', null, tests.answers(), 'v1', repeat('b', 64))$$,
  'another IP can still apply'
);

-- Per email: 5 a day, whatever the IP.
select lives_ok(
  $$select * from public.submit_application(tests.room_token('Hab A1'), 'h@example.org', 'H', null, tests.answers(), 'v1', null);
    select * from public.submit_application(tests.room_token('Hab A1'), 'h@example.org', 'H', null, tests.answers(), 'v1', null);
    select * from public.submit_application(tests.room_token('Hab A1'), 'h@example.org', 'H', null, tests.answers(), 'v1', null);
    select * from public.submit_application(tests.room_token('Hab A1'), 'h@example.org', 'H', null, tests.answers(), 'v1', null);
    select * from public.submit_application(tests.room_token('Hab A1'), 'H@example.org', 'H', null, tests.answers(), 'v1', null)$$,
  'up to 5 submissions per email in a day'
);
select throws_ok(
  $$select * from public.submit_application(tests.room_token('Hab A1'), 'h@example.org', 'H', null, tests.answers(), 'v1', null)$$,
  'P0001', 'rate_limited',
  'the 6th submission with the same email is rejected'
);

-- ---------------------------------------------------------------------
-- What members see and do
-- ---------------------------------------------------------------------
select tests.authenticate_as('bruno@example.org');
select results_eq(
  $$select (select count(*)::int from public.candidates where email = 'elena@example.org'),
           (select count(*)::int from public.applications a
              join public.candidates c on c.id = a.candidate_id where c.email = 'elena@example.org'),
           (select count(*)::int from public.consents co
              join public.candidates c on c.id = co.candidate_id where c.email = 'elena@example.org')$$,
  $$values (1, 2, 3)$$,
  'members (staff included) read the candidates, applications and consents'
);
select throws_ok(
  $$update public.applications set answers = '{}'$$,
  '42501', null,
  'members cannot change applications'
);

select tests.authenticate_as('carla@example.org');
select is_empty(
  $$select * from public.applications$$,
  'carla (Org B) sees no applications of Org A'
);

-- A room with applications is not deleted (it can be marked unavailable).
select tests.authenticate_as('diego@example.org');
select throws_ok(
  $$delete from public.rooms where name = 'Hab A1'$$,
  '23503', null,
  'a room with applications cannot be deleted'
);
select throws_ok(
  $$delete from public.properties where name = 'Piso A1'$$,
  '23503', null,
  'nor the property it belongs to'
);

-- ---------------------------------------------------------------------
-- Replacing a room's link
-- ---------------------------------------------------------------------
select tests.as_admin();
select set_config('tests.old_token', tests.room_token('Hab A1'), true);

select tests.authenticate_as('bruno@example.org');
select matches(
  public.rotate_room_token(tests.room_id('Hab A1')),
  '^[0-9a-f]{32}$',
  'any member (staff included) generates a new link'
);

select tests.authenticate_as_service();
select is_empty(
  $$select * from public.get_public_room(current_setting('tests.old_token'))$$,
  'the previous link no longer works'
);

select tests.authenticate_as('carla@example.org');
select throws_ok(
  $$select public.rotate_room_token(tests.room_id('Hab A1'))$$,
  'P0001', 'not_found',
  'another organization cannot replace the link'
);

-- Deleting a whole organization still works (the cascade through
-- candidates removes the applications in the same statement).
select tests.as_admin();
select lives_ok(
  $$delete from public.organizations where name = 'Org A'$$,
  'an organization with applications can be deleted'
);

select * from finish();
rollback;
