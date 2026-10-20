-- Milestone 1: multi-tenant core.
--
-- organizations  the operator (the tenant)
-- members        who belongs to which organization, and with which role
-- profiles       display data of each user (name, email), synced from auth.users
-- invitations    single-use links to join an organization
--
-- Access rules (see docs/decisions/0005-modelo-multi-tenant.md):
-- * Every table has RLS. Membership checks go through security definer
--   helpers in the `private` schema, which PostgREST does not expose.
-- * Rows that need several writes at once (create an organization and its
--   owner, accept an invitation) are written only through RPC functions.
-- * `anon` gets no privileges at all: nothing here is public.

-- =====================================================================
-- Hardening of default privileges
-- =====================================================================
-- By default Supabase grants every privilege on new tables, sequences and
-- functions of `public` to `anon`. Revoke it for everything created by
-- migrations from now on: a new table must not be reachable without a
-- session just because someone forgot a policy. Postgres also lets PUBLIC
-- execute any new function; that default is revoked too and each function
-- grants EXECUTE explicitly.
alter default privileges for role postgres in schema public
  revoke all on tables from anon;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon;
alter default privileges for role postgres in schema public
  revoke all on functions from anon;
alter default privileges for role postgres
  revoke execute on functions from public;

create schema private;
revoke all on schema private from public;
-- Policies run as the requesting role, so it must be able to call the helpers.
grant usage on schema private to authenticated;

-- =====================================================================
-- Tables
-- =====================================================================
create type public.member_role as enum ('owner', 'admin', 'staff');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);

-- Identity data, not business data: it has no org_id because one person can
-- belong to several organizations. Co-members can read it (see policies).
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Nullable so that a user without email (phone or anonymous sign-in, both
  -- disabled today) can never make the signup trigger fail.
  email text,
  full_name text check (char_length(full_name) between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- References profiles (not auth.users directly) so that PostgREST can
  -- embed the member's name and email. profiles cascades from auth.users.
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  -- Also serves as the index on org_id (leading column).
  unique (org_id, user_id)
);

create index members_user_id_idx on public.members (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (
    email = lower(btrim(email)) and char_length(email) between 3 and 254
  ),
  -- Owners are never invited: ownership is handed over to an existing member.
  role public.member_role not null check (role <> 'owner'),
  -- SHA-256 of the token. The token itself is shown once and never stored,
  -- so a leaked copy of this table cannot be used to join anything.
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz
);

create index invitations_org_id_idx on public.invitations (org_id);
create index invitations_invited_by_idx on public.invitations (invited_by);
create index invitations_accepted_by_idx on public.invitations (accepted_by);
-- At most one open invitation per email and organization.
create unique index invitations_open_email_idx on public.invitations (org_id, email)
  where accepted_at is null and revoked_at is null;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.invitations enable row level security;

-- =====================================================================
-- Helpers used by the policies
-- =====================================================================
-- security definer: they read `members` bypassing its RLS. Querying `members`
-- from a policy on `members` would otherwise recurse forever.
-- `(select auth.uid())` is evaluated once per statement, not once per row.

create function private.is_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.org_id = target_org
      and m.user_id = (select auth.uid())
  );
$$;

create function private.has_role(target_org uuid, allowed public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members m
    where m.org_id = target_org
      and m.user_id = (select auth.uid())
      and m.role = any (allowed)
  );
$$;

-- True when the current user and `other_user` belong to a common organization.
create function private.shares_org(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members mine
    join public.members theirs on theirs.org_id = mine.org_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = other_user
  );
$$;

revoke all on function private.is_member(uuid) from public;
revoke all on function private.has_role(uuid, public.member_role[]) from public;
revoke all on function private.shares_org(uuid) from public;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.has_role(uuid, public.member_role[]) to authenticated;
grant execute on function private.shares_org(uuid) to authenticated;

-- =====================================================================
-- Profiles: kept in sync with auth.users
-- =====================================================================
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- full_name comes from user metadata, which the user controls: trim it and
  -- cap it so the check constraint can never block a signup.
  insert into public.profiles (user_id, email, full_name)
  values (
    new.id,
    lower(new.email),
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100), '')
  );
  return new;
end;
$$;

create function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(new.email) where user_id = new.id;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
revoke all on function private.handle_user_email_change() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- auth.users.email only changes once the user confirms the new address.
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- =====================================================================
-- Members: role rules that a policy cannot express
-- =====================================================================
-- * Only an owner can touch an owner row or make someone an owner.
-- * An organization can never be left without an owner.
create function private.guard_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role public.member_role;
begin
  -- No end user behind the request (service role, SQL console): trusted.
  if actor is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- Cascade from a deleted organization: there is nothing left to protect.
  if tg_op = 'DELETE'
    and not exists (select 1 from public.organizations o where o.id = old.org_id) then
    return old;
  end if;

  -- Serialize membership changes per organization, so two owners demoting
  -- themselves at the same time cannot both pass the last-owner check.
  perform 1 from public.organizations o where o.id = old.org_id for update;

  select m.role into actor_role
  from public.members m
  where m.org_id = old.org_id and m.user_id = actor;

  if tg_op = 'UPDATE' then
    if new.org_id <> old.org_id or new.user_id <> old.user_id then
      raise exception 'member_immutable' using errcode = '42501';
    end if;
    if actor_role is distinct from 'owner' and 'owner' in (old.role, new.role) then
      raise exception 'insufficient_role' using errcode = '42501';
    end if;
  elsif old.user_id <> actor and old.role = 'owner' and actor_role is distinct from 'owner' then
    raise exception 'insufficient_role' using errcode = '42501';
  end if;

  if old.role = 'owner'
    and (tg_op = 'DELETE' or new.role <> 'owner')
    and not exists (
      select 1 from public.members m
      where m.org_id = old.org_id and m.role = 'owner' and m.id <> old.id
    ) then
    raise exception 'last_owner' using errcode = 'P0001';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.guard_member_change() from public;

create trigger guard_member_change
  before update or delete on public.members
  for each row execute function private.guard_member_change();

-- =====================================================================
-- Privileges and policies
-- =====================================================================
-- Column-level grants: even with a permissive policy, only these columns can
-- be written through the API.
revoke all on table public.organizations, public.profiles, public.members, public.invitations
  from anon, authenticated;

grant select on table public.organizations, public.profiles, public.members, public.invitations
  to authenticated;
grant update (name) on table public.organizations to authenticated;
grant update (full_name) on table public.profiles to authenticated;
grant update (role), delete on table public.members to authenticated;
grant update (revoked_at) on table public.invitations to authenticated;

-- organizations: inserted by create_organization(); deleting is milestone 7.
create policy "members read their organizations"
  on public.organizations for select to authenticated
  using (private.is_member(id));

create policy "owners and admins rename their organization"
  on public.organizations for update to authenticated
  using (private.has_role(id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_role(id, array['owner', 'admin']::public.member_role[]));

-- profiles: inserted and kept in sync by the triggers on auth.users.
create policy "users read their own profile and their co-members'"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or private.shares_org(user_id));

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- members: inserted by create_organization() and accept_invitation().
create policy "members read the members of their organizations"
  on public.members for select to authenticated
  using (private.is_member(org_id));

create policy "owners and admins change roles"
  on public.members for update to authenticated
  using (private.has_role(org_id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_role(org_id, array['owner', 'admin']::public.member_role[]));

create policy "owners and admins remove members; anyone can leave"
  on public.members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role(org_id, array['owner', 'admin']::public.member_role[])
  );

-- invitations: inserted by create_invitation(); revoked by setting revoked_at.
create policy "owners and admins read invitations"
  on public.invitations for select to authenticated
  using (private.has_role(org_id, array['owner', 'admin']::public.member_role[]));

create policy "owners and admins revoke invitations"
  on public.invitations for update to authenticated
  using (private.has_role(org_id, array['owner', 'admin']::public.member_role[]))
  with check (private.has_role(org_id, array['owner', 'admin']::public.member_role[]));

-- =====================================================================
-- RPC functions (called by the app with the user's session)
-- =====================================================================
-- Errors are raised with a stable message code that the app translates.

-- Creates an organization with the current user as its owner.
create function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  new_org uuid;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Abuse guard: nobody legitimately owns more than a handful of companies.
  if (select count(*) from public.members m where m.user_id = actor and m.role = 'owner') >= 10 then
    raise exception 'organization_limit' using errcode = 'P0001';
  end if;

  insert into public.organizations (name)
  values (btrim(org_name))
  returning id into new_org;

  insert into public.members (org_id, user_id, role)
  values (new_org, actor, 'owner');

  return new_org;
end;
$$;

-- Creates an invitation and returns its token. The token is only ever
-- returned here: the table keeps its hash. Inviting the same email again
-- revokes the previous open invitation (it works as "regenerate the link").
create function public.create_invitation(
  target_org uuid,
  invitee_email text,
  invitee_role public.member_role
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(invitee_email));
  token text;
begin
  if not private.has_role(target_org, array['owner', 'admin']::public.member_role[]) then
    raise exception 'insufficient_role' using errcode = '42501';
  end if;

  if invitee_role = 'owner' then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.members m
    join public.profiles p on p.user_id = m.user_id
    where m.org_id = target_org and p.email = normalized_email
  ) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  update public.invitations i
  set revoked_at = now()
  where i.org_id = target_org
    and i.email = normalized_email
    and i.accepted_at is null
    and i.revoked_at is null;

  if (
    select count(*) from public.invitations i
    where i.org_id = target_org
      and i.accepted_at is null
      and i.revoked_at is null
      and i.expires_at > now()
  ) >= 50 then
    raise exception 'invitation_limit' using errcode = 'P0001';
  end if;

  token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.invitations (org_id, email, role, token_hash, invited_by)
  values (
    target_org,
    normalized_email,
    invitee_role,
    encode(sha256(convert_to(token, 'UTF8')), 'hex'),
    (select auth.uid())
  );

  return token;
end;
$$;

-- What the invitation page shows before accepting. Returns no rows for an
-- unknown token. It does not reveal the invited email, only whether it
-- matches the current user's.
create function public.get_invitation(invitation_token text)
returns table (
  org_name text,
  role public.member_role,
  status text,
  email_matches boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.name,
    i.role,
    case
      when i.accepted_at is not null then 'accepted'
      when i.revoked_at is not null then 'revoked'
      when i.expires_at <= now() then 'expired'
      else 'pending'
    end,
    i.email = (select lower(u.email) from auth.users u where u.id = (select auth.uid()))
  from public.invitations i
  join public.organizations o on o.id = i.org_id
  where (select auth.uid()) is not null
    and i.token_hash = encode(sha256(convert_to(invitation_token, 'UTF8')), 'hex');
$$;

-- Joins the organization of an open invitation addressed to the current
-- user's confirmed email. Returns the organization id.
create function public.accept_invitation(invitation_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_email text;
  inv public.invitations;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into inv
  from public.invitations i
  where i.token_hash = encode(sha256(convert_to(invitation_token, 'UTF8')), 'hex')
  for update;

  if not found or inv.revoked_at is not null then
    raise exception 'invitation_invalid' using errcode = 'P0001';
  end if;

  -- Already accepted by this same user (double click, reload): idempotent.
  if inv.accepted_at is not null then
    if inv.accepted_by = actor then
      return inv.org_id;
    end if;
    raise exception 'invitation_invalid' using errcode = 'P0001';
  end if;

  if inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;

  select lower(u.email) into actor_email
  from auth.users u
  where u.id = actor and u.email_confirmed_at is not null;

  if actor_email is distinct from inv.email then
    raise exception 'invitation_email_mismatch' using errcode = 'P0001';
  end if;

  insert into public.members (org_id, user_id, role)
  values (inv.org_id, actor, inv.role)
  on conflict (org_id, user_id) do nothing;

  update public.invitations
  set accepted_at = now(), accepted_by = actor
  where id = inv.id;

  return inv.org_id;
end;
$$;

revoke all on function public.create_organization(text) from public;
revoke all on function public.create_invitation(uuid, text, public.member_role) from public;
revoke all on function public.get_invitation(text) from public;
revoke all on function public.accept_invitation(text) from public;
grant execute on function public.create_organization(text) to authenticated;
grant execute on function public.create_invitation(uuid, text, public.member_role) to authenticated;
grant execute on function public.get_invitation(text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
