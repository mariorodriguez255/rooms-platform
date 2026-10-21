-- Milestone 2: the private Storage bucket for property and room photos.
-- See docs/decisions/0009-fotos.md.
--
-- * Private: files are only served through short-lived signed URLs, never
--   at a permanent public address.
-- * Object names start with the organization id
--   (<org_id>/<property_id>/<uuid>.jpg) and the policies below only let
--   members of that organization read, upload or delete them.
-- * The browser resizes photos and re-encodes them as JPEG before upload,
--   so only JPEG up to 3 MiB is accepted.
-- * Files are never overwritten (no update policy) and are deleted through
--   the Storage API, never with SQL (that would orphan the file).

-- Buckets are rows, not schema: schema diffs never capture them, so the
-- bucket is created here by hand (also on the hosted project, by db push).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 3 * 1024 * 1024, array['image/jpeg']);

-- Organization that an object belongs to: the first folder of its name.
-- Null (so no policy matches) when it is not a UUID, instead of an error
-- from a failed cast.
create function private.org_from_path(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(object_name, '/', 1)
      ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(object_name, '/', 1)::uuid
  end;
$$;

revoke all on function private.org_from_path(text) from public;
grant execute on function private.org_from_path(text) to authenticated;

create policy "members read their organization's photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos' and private.is_member(private.org_from_path(name)));

create policy "members upload photos to their organization"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and private.is_member(private.org_from_path(name)));

create policy "members delete their organization's photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and private.is_member(private.org_from_path(name)));
