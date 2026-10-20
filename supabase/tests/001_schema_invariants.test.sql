-- Architecture invariants (CLAUDE.md), checked against the catalog so that
-- they also hold for every table added in later milestones.
begin;
\ir _helpers.psql

select plan(7);

select is_empty(
  $$
    select c.relname
    from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'every table in public has RLS enabled'
);

-- Allow-list of tables without org_id: the tenant itself and user identity.
-- Adding a table here needs a reason in docs/decisions/.
select is_empty(
  $$
    select c.relname
    from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'p')
      and c.relname not in ('organizations', 'profiles')
      and not exists (
        select 1 from pg_attribute a
        where a.attrelid = c.oid
          and a.attname = 'org_id'
          and a.attnotnull
          and not a.attisdropped
      )
  $$,
  'every business table has a non-null org_id'
);

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'org_id'
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'p')
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.oid and i.indkey[0] = a.attnum
      )
  $$,
  'every org_id column is the leading column of an index'
);

select is_empty(
  $$
    select con.conrelid::regclass::text || ' (' || con.conname || ')'
    from pg_constraint con
    where con.contype = 'f'
      and con.connamespace = 'public'::regnamespace
      and not exists (
        select 1 from pg_index i
        where i.indrelid = con.conrelid
          and (i.indkey::int2[])[0:array_length(con.conkey, 1) - 1] = con.conkey
      )
  $$,
  'every foreign key is covered by an index'
);

select is_empty(
  $$
    select c.relname
    from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'p', 'v', 'm')
      and has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger')
  $$,
  'anon has no privileges on any table or view in public'
);

-- Only functions that can be called (through the API or SQL) matter:
-- - trigger and event trigger functions cannot be called directly, whatever
--   their privileges (e.g. public.rls_auto_enable(), which the hosted
--   project creates to enable RLS on new tables);
-- - functions that belong to an extension are not ours to restrict.
select is_empty(
  $$
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
      and p.prorettype not in ('trigger'::regtype, 'event_trigger'::regtype)
      and has_function_privilege('anon', p.oid, 'execute')
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'
      )
  $$,
  'anon cannot execute any of our callable functions'
);

-- Without a fixed search_path, a security definer function can be tricked
-- into calling objects planted in another schema.
select is_empty(
  $$
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
      and p.prosecdef
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) setting
        where setting like 'search_path=%'
      )
  $$,
  'every security definer function pins its search_path'
);

select * from finish();
rollback;
