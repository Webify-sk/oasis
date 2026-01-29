-- Add role column to profiles if it doesn't exist
alter table public.profiles 
add column if not exists role text default 'user' check (role in ('user', 'admin'));

-- Update RLS policies to give admins full access
create policy "Admins can view all profiles." on public.profiles
  for select using (auth.uid() in (select id from public.profiles where role = 'admin'));

create policy "Admins can update all profiles." on public.profiles
  for update using (auth.uid() in (select id from public.profiles where role = 'admin'));

create policy "Admins can delete all profiles." on public.profiles
  for delete using (auth.uid() in (select id from public.profiles where role = 'admin'));

-- Set specific user as admin (using email match since we might not know UUID)
-- Note: This requires the user to have already signed up. 
-- If they haven't, they will need to be updated manually after signup.
update public.profiles
set role = 'admin'
where email = 'bkonecny45@gmail.com';

-- Verify update
-- select * from public.profiles where email = 'bkonecny45@gmail.com';
