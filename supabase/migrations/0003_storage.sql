-- Private storage buckets + per-user isolation policies.
--
-- Both buckets are private. Images reach the browser only through short-lived
-- signed URLs minted server-side, so raw storage paths are never public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('generations', 'generations', false, 26214400,
   array['image/png', 'image/jpeg', 'image/webp']),
  ('uploads', 'uploads', false, 10485760,
   array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Object keys are laid out as: users/{user_id}/...
-- storage.foldername(name) returns the path segments, so element 2 is the uid.
create policy "generations_read_own"
  on storage.objects for select
  using (
    bucket_id = 'generations'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "generations_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'generations'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "uploads_read_own"
  on storage.objects for select
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "uploads_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Writes are performed exclusively by the server using the service role, which
-- bypasses RLS. No insert/update policy is granted to authenticated clients.
