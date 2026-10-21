-- Milestone 3: the public application form.
--
-- candidates    a person who applied, deduplicated by email per organization
-- applications  one candidate's answers for one room
-- consents      proof of the consent given with each submission
--
-- See docs/decisions/0010-formulario-publico.md:
-- * Candidates never sign in. The public page and the submission go through
--   two functions that only `service_role` can execute; the app calls them
--   from the server, after its own checks (honeypot, validation). `anon`
--   still has no privileges at all, so nobody can skip the server by
--   calling the API directly.
-- * Each room has a random public token for its link; members can replace
--   it, which breaks the old link.
-- * The keys of `answers` are an allow-list, also enforced here: adding a
--   question takes a migration.
-- * Submissions are rate limited per IP (stored only as a keyed hash) and
--   per email.

-- =====================================================================
-- Organizations and rooms
-- =====================================================================
-- Where candidates exercise their data protection rights, shown on the
-- public form. Without it, the organization's links do not accept
-- applications.
alter table public.organizations
  add column contact_email text check (
    contact_email = lower(btrim(contact_email)) and char_length(contact_email) between 3 and 254
  );

grant update (contact_email) on table public.organizations to authenticated;

-- 128 random bits in hex: impossible to guess or enumerate. Stored as is
-- (unlike invitation tokens) because the link is meant to be shared and
-- only lets someone apply. Existing rooms get one each.
alter table public.rooms
  add column public_token text not null
    default encode(extensions.gen_random_bytes(16), 'hex')
    check (public_token ~ '^[0-9a-f]{32}$'),
  add constraint rooms_public_token_key unique (public_token),
  -- Target of the composite foreign key of applications.
  add constraint rooms_org_id_id_key unique (org_id, id);

-- =====================================================================
-- Tables
-- =====================================================================
create type public.consent_purpose as enum ('application');

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  phone text check (char_length(phone) between 6 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Also the index on org_id.
  unique (org_id, email),
  unique (org_id, id)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  room_id uuid not null,
  candidate_id uuid not null,
  -- Allow-list of questions (src/lib/applications/questionnaire.ts). Only
  -- the keys are checked here; the app validates types and ranges.
  answers jsonb not null check (
    jsonb_typeof(answers) = 'object'
    and answers - array[
      'move_in_date', 'stay_months', 'occupation', 'monthly_income', 'schedule',
      'remote_work', 'cleanliness', 'noise', 'visits', 'common_areas', 'smoking',
      'pets', 'introduction', 'adult_declared'
    ] = '{}'::jsonb
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- No action (not cascade): a room with applications cannot be deleted,
  -- only marked unavailable. Not `restrict` either, so that deleting a
  -- whole organization (which also cascades through candidates) works.
  foreign key (org_id, room_id) references public.rooms (org_id, id),
  foreign key (org_id, candidate_id) references public.candidates (org_id, id) on delete cascade,
  -- Applying again to the same room updates the application.
  unique (room_id, candidate_id),
  unique (org_id, id)
);

create index applications_org_id_room_id_idx on public.applications (org_id, room_id);
create index applications_org_id_candidate_id_idx on public.applications (org_id, candidate_id);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  candidate_id uuid not null,
  application_id uuid not null,
  purpose public.consent_purpose not null,
  -- Version of the text the candidate accepted (src/lib/applications/
  -- consent.ts). Published texts never change; new wording, new version.
  text_version text not null check (char_length(text_version) between 1 and 50),
  accepted_at timestamptz not null default now(),
  -- HMAC-SHA256 of the IP with a server secret: proof without storing it.
  ip_hash text check (ip_hash ~ '^[0-9a-f]{64}$'),
  foreign key (org_id, candidate_id) references public.candidates (org_id, id) on delete cascade,
  foreign key (org_id, application_id) references public.applications (org_id, id) on delete cascade
);

create index consents_org_id_candidate_id_idx on public.consents (org_id, candidate_id);
create index consents_org_id_application_id_idx on public.consents (org_id, application_id);

alter table public.candidates enable row level security;
alter table public.applications enable row level security;
alter table public.consents enable row level security;

create trigger set_updated_at
  before update on public.candidates
  for each row execute function private.set_updated_at();

create trigger set_updated_at
  before update on public.applications
  for each row execute function private.set_updated_at();

-- Members read; nobody writes through the API (only submit_application).
-- Deleting comes with the pipeline (milestone 4) and the retention rules.
revoke all on table public.candidates, public.applications, public.consents
  from anon, authenticated;
grant select on table public.candidates, public.applications, public.consents
  to authenticated;

create policy "members read candidates"
  on public.candidates for select to authenticated
  using (private.is_member(org_id));

create policy "members read applications"
  on public.applications for select to authenticated
  using (private.is_member(org_id));

create policy "members read consents"
  on public.consents for select to authenticated
  using (private.is_member(org_id));

-- =====================================================================
-- Rate limiting
-- =====================================================================
-- One row per counted event. In `private` (not exposed by the API) and
-- without org_id: it is not business data.
create table private.rate_limit_events (
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_bucket_key_idx
  on private.rate_limit_events (bucket, key, created_at);
create index rate_limit_events_created_at_idx
  on private.rate_limit_events (created_at);

alter table private.rate_limit_events enable row level security;
revoke all on table private.rate_limit_events from public, anon, authenticated;

-- Records an event and returns false when `bucket`/`key` already reached
-- `max_events` within `per`. Called inside the transaction of the action it
-- protects: if that action fails, the event is rolled back with it. Not
-- exact under concurrency, which is fine for its purpose.
create function private.hit_rate_limit(
  bucket text,
  key text,
  max_events integer,
  per interval
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  -- Housekeeping: no limit looks further back than a day.
  delete from private.rate_limit_events e where e.created_at < now() - interval '1 day';

  select count(*) into recent
  from private.rate_limit_events e
  where e.bucket = hit_rate_limit.bucket
    and e.key = hit_rate_limit.key
    and e.created_at > now() - per;

  if recent >= max_events then
    return false;
  end if;

  insert into private.rate_limit_events (bucket, key)
  values (hit_rate_limit.bucket, hit_rate_limit.key);
  return true;
end;
$$;

revoke all on function private.hit_rate_limit(text, text, integer, interval) from public;

-- =====================================================================
-- Functions for the public form (service_role only)
-- =====================================================================
-- What the public page shows for a token. No rows for an unknown token.
-- Never the address or ids: only what a candidate needs to decide.
create function public.get_public_room(room_token text)
returns table (
  room_name text,
  city text,
  region public.spanish_region,
  price_cents integer,
  deposit_cents integer,
  size_m2 numeric,
  features jsonb,
  status public.room_status,
  available_from date,
  org_name text,
  contact_email text,
  accepting boolean,
  photos jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.name,
    p.city,
    p.region,
    r.price_cents,
    r.deposit_cents,
    r.size_m2,
    r.features,
    r.status,
    r.available_from,
    o.name,
    o.contact_email,
    r.status <> 'unavailable' and o.contact_email is not null,
    -- The room's photos first, then those of the common areas.
    coalesce((
      select jsonb_agg(
        jsonb_build_object('path', ph.storage_path, 'width', ph.width, 'height', ph.height)
        order by ph.room_id is null, ph.created_at
      )
      from public.photos ph
      where ph.property_id = r.property_id
        and (ph.room_id = r.id or ph.room_id is null)
    ), '[]'::jsonb)
  from public.rooms r
  join public.properties p on p.id = r.property_id
  join public.organizations o on o.id = r.org_id
  where r.public_token = room_token;
$$;

-- Stores an application in one transaction: candidate (by email, latest
-- contact details win), application (one per candidate and room, answers
-- replaced on a new submission) and consent. The app has validated the
-- input; constraints check it again.
create function public.submit_application(
  room_token text,
  candidate_email text,
  candidate_name text,
  candidate_phone text,
  answers jsonb,
  consent_version text,
  client_ip_hash text
)
returns table (application_id uuid, is_new boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.rooms;
  normalized_email text := lower(btrim(candidate_email));
  candidate uuid;
  application uuid;
  inserted boolean;
begin
  select r.* into target
  from public.rooms r
  where r.public_token = room_token;

  if not found then
    raise exception 'room_not_found' using errcode = 'P0001';
  end if;

  if target.status = 'unavailable' or not exists (
    select 1 from public.organizations o
    where o.id = target.org_id and o.contact_email is not null
  ) then
    raise exception 'room_closed' using errcode = 'P0001';
  end if;

  -- Per IP (when known) and per email address.
  if (client_ip_hash is not null and (
        not private.hit_rate_limit('application_ip_10min', client_ip_hash, 5, interval '10 minutes')
        or not private.hit_rate_limit('application_ip_day', client_ip_hash, 20, interval '1 day')
      ))
    or not private.hit_rate_limit('application_email_day', normalized_email, 5, interval '1 day') then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.candidates (org_id, email, name, phone)
  values (target.org_id, normalized_email, btrim(candidate_name), nullif(btrim(candidate_phone), ''))
  on conflict (org_id, email) do update
    set name = excluded.name, phone = excluded.phone
  returning id into candidate;

  -- xmax = 0 only for a row this statement inserted (not updated).
  insert into public.applications as a (org_id, room_id, candidate_id, answers)
  values (target.org_id, target.id, candidate, submit_application.answers)
  on conflict (room_id, candidate_id) do update
    set answers = excluded.answers
  returning a.id, (a.xmax = 0) into application, inserted;

  insert into public.consents (org_id, candidate_id, application_id, purpose, text_version, ip_hash)
  values (target.org_id, candidate, application, 'application', consent_version, client_ip_hash);

  return query select application, inserted;
end;
$$;

revoke all on function public.get_public_room(text) from public, anon, authenticated;
revoke all on function public.submit_application(text, text, text, text, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.get_public_room(text) to service_role;
grant execute on function public.submit_application(text, text, text, text, jsonb, text, text)
  to service_role;

-- =====================================================================
-- Replacing a room's link (members)
-- =====================================================================
-- Generates a new token; the previous link stops working at once.
create function public.rotate_room_token(target_room uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
begin
  update public.rooms r
  set public_token = encode(extensions.gen_random_bytes(16), 'hex')
  where r.id = target_room
    and private.is_member(r.org_id)
  returning r.public_token into token;

  if token is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  return token;
end;
$$;

revoke all on function public.rotate_room_token(uuid) from public, anon;
grant execute on function public.rotate_room_token(uuid) to authenticated;
