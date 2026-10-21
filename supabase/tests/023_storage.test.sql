begin;
\ir _helpers.psql

-- Policies of the photos bucket, checked on storage.objects directly. These
-- rows are metadata only (no file is stored) and the rollback removes them.
-- The integration tests repeat the scenario through the Storage API.
-- Queries as postgres filter by the test organizations: the bucket may hold
-- other files (the hosted project, with --linked, has real ones).

select plan(16);
select tests.two_orgs();
select tests.create_property('Org A', 'Piso A1');
select tests.create_property('Org B', 'Piso B1');

-- Storage refuses DELETE statements on its tables unless this is set (it
-- protects against orphaning files). Needed here to test the policy.
set local storage.allow_delete_query = 'true';

select results_eq(
  $$select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'photos'$$,
  $$values (false, 3145728::bigint, array['image/jpeg'])$$,
  'the photos bucket is private, JPEG only and up to 3 MiB'
);

select is(
  private.org_from_path(tests.org_id('Org A')::text || '/x/y.jpg'),
  tests.org_id('Org A'),
  'org_from_path reads the organization from the first folder'
);
select is(
  private.org_from_path('not-a-uuid/x/y.jpg'),
  null,
  'org_from_path returns null instead of failing on other names'
);

-- Uploading.
select tests.authenticate_as('bruno@example.org');
select set_config('tests.path_a', tests.photo_path('Piso A1'), true);
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('photos', current_setting('tests.path_a'))$$,
  'a member uploads into the folder of their organization'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('photos', tests.photo_path('Piso B1'))$$,
  '42501', null,
  'nobody uploads into the folder of another organization'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('photos', 'shared/x.jpg')$$,
  '42501', null,
  'nobody uploads outside an organization folder'
);

select tests.authenticate_as('frank@example.org');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('photos', tests.photo_path('Piso A1'))$$,
  '42501', null,
  'a user without organizations uploads nothing'
);

-- Reading.
select tests.authenticate_as('ana@example.org');
select results_eq(
  $$select name from storage.objects where bucket_id = 'photos'$$,
  array[current_setting('tests.path_a')],
  'members of the organization see its photos'
);

select tests.authenticate_as('carla@example.org');
select is_empty(
  $$select name from storage.objects where bucket_id = 'photos'$$,
  'carla (Org B) does not see the photos of Org A'
);

select tests.authenticate_as_anon();
select is_empty(
  $$select name from storage.objects where bucket_id = 'photos'$$,
  'anon sees no photos'
);

-- Files are never overwritten.
select tests.authenticate_as('ana@example.org');
select is_empty(
  $$update storage.objects set metadata = '{}' where bucket_id = 'photos' returning id$$,
  'members cannot update objects'
);

-- Deleting.
select tests.authenticate_as('carla@example.org');
select is_empty(
  $$delete from storage.objects where bucket_id = 'photos' returning id$$,
  'carla cannot delete the photos of Org A'
);

select tests.authenticate_as_anon();
select is_empty(
  $$delete from storage.objects where bucket_id = 'photos' returning id$$,
  'anon cannot delete photos'
);

select tests.as_admin();
select results_eq(
  $$select count(*)::int from storage.objects
    where bucket_id = 'photos'
      and private.org_from_path(name) = tests.org_id('Org A')$$,
  array[1],
  'the denied writes left the object intact'
);

select tests.authenticate_as('bruno@example.org');
select results_eq(
  $$delete from storage.objects where bucket_id = 'photos' returning name$$,
  array[current_setting('tests.path_a')],
  'any member (staff included) deletes photos of their organization'
);

-- Leaving the organization removes access to its files.
select tests.as_admin();
insert into storage.objects (bucket_id, name) values ('photos', tests.photo_path('Piso A1'));
delete from public.members where user_id = tests.user_id('bruno@example.org');
select tests.authenticate_as('bruno@example.org');
select is_empty(
  $$select name from storage.objects where bucket_id = 'photos'$$,
  'a former member no longer sees the photos'
);

select * from finish();
rollback;
