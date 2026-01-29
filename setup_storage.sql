-- Create a storage bucket 'avatars' if not exists
-- Note: Creating buckets via SQL in Supabase is done by inserting into storage.buckets
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Set up security policies for the 'avatars' bucket
-- Allow public access to view avatars
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Allow authenticated users (or specifically admins) to upload avatars
create policy "Admins can upload avatars."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' AND public.is_admin() );

create policy "Admins can update avatars."
  on storage.objects for update
  using ( bucket_id = 'avatars' AND public.is_admin() );

create policy "Admins can delete avatars."
  on storage.objects for delete
  using ( bucket_id = 'avatars' AND public.is_admin() );
