-- Milestone 2: properties (flats), their rooms and their photos.
--
-- properties  a flat rented out by rooms
-- rooms       a room of a property: price, status and the date it becomes free
-- photos      photos of a room, or of the common areas of a property
--             (room_id null). The files live in Storage (next migration).
--
-- See docs/decisions/0008-pisos-y-habitaciones.md and 0009-fotos.md:
-- * Money is stored in euro cents (integer): no rounding errors.
-- * Composite foreign keys keep every child row in the organization of its
--   parent. Foreign key checks bypass RLS, so without them a member could
--   point their own room at another organization's property.
-- * Every member creates and edits; only owners and admins delete
--   properties and rooms (and, through the cascade, their photos).
-- * The room status is what the operator decides (vacant, occupied,
--   unavailable) plus a date. What the board shows ("frees up on…") is
--   derived from both in the app, so nothing has to change at midnight.

-- =====================================================================
-- Types
-- =====================================================================
-- ISO 3166-2:ES codes of the 17 autonomous communities and the 2
-- autonomous cities. The UI translates them.
create type public.spanish_region as enum (
  'ES-AN', 'ES-AR', 'ES-AS', 'ES-CB', 'ES-CE', 'ES-CL', 'ES-CM', 'ES-CN', 'ES-CT', 'ES-EX',
  'ES-GA', 'ES-IB', 'ES-MC', 'ES-MD', 'ES-ML', 'ES-NC', 'ES-PV', 'ES-RI', 'ES-VC'
);

create type public.room_status as enum ('vacant', 'occupied', 'unavailable');

-- =====================================================================
-- Tables
-- =====================================================================
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  address text not null check (char_length(btrim(address)) between 1 and 200),
  city text not null check (char_length(btrim(city)) between 1 and 100),
  region public.spanish_region not null,
  -- Reference rent of the whole flat (optional), in cents.
  total_rent_reference_cents integer check (total_rent_reference_cents between 0 and 9999999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target of the composite foreign keys; also the index on org_id.
  unique (org_id, id),
  unique (org_id, name)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  property_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  -- Monthly rent asked for the room, in cents.
  price_cents integer not null check (price_cents between 1 and 9999999),
  deposit_cents integer check (deposit_cents between 0 and 9999999),
  size_m2 numeric(5, 1) check (size_m2 > 0 and size_m2 < 1000),
  -- Flags such as {"balcony": true}. Which keys exist is an allow-list in
  -- the app (src/lib/rooms/features.ts); here, only booleans are accepted.
  features jsonb not null default '{}' check (
    jsonb_typeof(features) = 'object'
    and not jsonb_path_exists(features, '$.* ? (@.type() != "boolean")')
  ),
  status public.room_status not null default 'vacant',
  -- The date the room is free for a new tenant: when the current one
  -- leaves (occupied) or when it can be let again (vacant). Null: now, or
  -- unknown for an occupied room.
  available_from date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, property_id) references public.properties (org_id, id) on delete cascade,
  -- Target of the photos foreign key.
  unique (property_id, id),
  unique (property_id, name)
);

-- Covers the composite foreign key and serves as the index on org_id.
create index rooms_org_id_property_id_idx on public.rooms (org_id, property_id);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  property_id uuid not null,
  -- Null: a photo of the common areas of the property.
  room_id uuid,
  -- Object name in the `photos` bucket: <org_id>/<property_id>/<uuid>.jpg.
  -- The org prefix is what the Storage policies check.
  storage_path text not null unique check (
    starts_with(storage_path, org_id::text || '/' || property_id::text || '/')
    and storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
  ),
  -- Size of the image after resizing, to reserve its space while it loads.
  width integer not null check (width between 1 and 4096),
  height integer not null check (height between 1 and 4096),
  created_at timestamptz not null default now(),
  foreign key (org_id, property_id) references public.properties (org_id, id) on delete cascade,
  -- MATCH SIMPLE: not checked while room_id is null (common areas).
  foreign key (property_id, room_id) references public.rooms (property_id, id) on delete cascade
);

create index photos_org_id_property_id_idx on public.photos (org_id, property_id);
create index photos_property_id_room_id_idx on public.photos (property_id, room_id);

alter table public.properties enable row level security;
alter table public.rooms enable row level security;
alter table public.photos enable row level security;

-- =====================================================================
-- Triggers
-- =====================================================================
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

create trigger set_updated_at
  before update on public.properties
  for each row execute function private.set_updated_at();

create trigger set_updated_at
  before update on public.rooms
  for each row execute function private.set_updated_at();

-- Abuse guards: nobody legitimately needs more than this. They are not
-- exact under concurrent inserts, which is fine for their purpose.
-- security definer: the counts must see every row, whatever the policies.
create function private.check_inventory_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'properties' then
    if (select count(*) from public.properties p where p.org_id = new.org_id) >= 100 then
      raise exception 'property_limit' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'rooms' then
    if (select count(*) from public.rooms r where r.property_id = new.property_id) >= 20 then
      raise exception 'room_limit' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'photos' then
    if (
      select count(*) from public.photos ph
      where ph.property_id = new.property_id
        and ph.room_id is not distinct from new.room_id
    ) >= 20 then
      raise exception 'photo_limit' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.check_inventory_limits() from public;

create trigger check_inventory_limits
  before insert on public.properties
  for each row execute function private.check_inventory_limits();

create trigger check_inventory_limits
  before insert on public.rooms
  for each row execute function private.check_inventory_limits();

create trigger check_inventory_limits
  before insert on public.photos
  for each row execute function private.check_inventory_limits();

-- =====================================================================
-- Privileges and policies
-- =====================================================================
-- Column-level grants: ids, timestamps and the organization are never
-- written by the app after insert, and a room never moves to another
-- property. Photos are inserted and deleted, never changed.
revoke all on table public.properties, public.rooms, public.photos from anon, authenticated;

grant select, delete on table public.properties, public.rooms, public.photos to authenticated;
grant insert (org_id, name, address, city, region, total_rent_reference_cents)
  on table public.properties to authenticated;
grant update (name, address, city, region, total_rent_reference_cents)
  on table public.properties to authenticated;
grant insert (
  org_id, property_id, name, price_cents, deposit_cents, size_m2, features, status, available_from
) on table public.rooms to authenticated;
grant update (name, price_cents, deposit_cents, size_m2, features, status, available_from)
  on table public.rooms to authenticated;
grant insert (org_id, property_id, room_id, storage_path, width, height)
  on table public.photos to authenticated;

-- properties
create policy "members read properties"
  on public.properties for select to authenticated
  using (private.is_member(org_id));

create policy "members create properties"
  on public.properties for insert to authenticated
  with check (private.is_member(org_id));

create policy "members edit properties"
  on public.properties for update to authenticated
  using (private.is_member(org_id))
  with check (private.is_member(org_id));

create policy "owners and admins delete properties"
  on public.properties for delete to authenticated
  using (private.has_role(org_id, array['owner', 'admin']::public.member_role[]));

-- rooms
create policy "members read rooms"
  on public.rooms for select to authenticated
  using (private.is_member(org_id));

create policy "members create rooms"
  on public.rooms for insert to authenticated
  with check (private.is_member(org_id));

create policy "members edit rooms"
  on public.rooms for update to authenticated
  using (private.is_member(org_id))
  with check (private.is_member(org_id));

create policy "owners and admins delete rooms"
  on public.rooms for delete to authenticated
  using (private.has_role(org_id, array['owner', 'admin']::public.member_role[]));

-- photos: any member adds and removes them (removing the file is done by
-- the app through the Storage API, see 0009-fotos.md).
create policy "members read photos"
  on public.photos for select to authenticated
  using (private.is_member(org_id));

create policy "members add photos"
  on public.photos for insert to authenticated
  with check (private.is_member(org_id));

create policy "members delete photos"
  on public.photos for delete to authenticated
  using (private.is_member(org_id));
