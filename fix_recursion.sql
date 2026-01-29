-- Fix Infinite Recursion in RLS Policies

-- 1. Create a secure function to check admin status
-- SECURITY DEFINER means this runs with the privileges of the creator (postgres/admin),
-- bypassing RLS on the 'profiles' table preventing the recursion loop.
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 2. Drop the recursive policies
drop policy if exists "Admins can view all profiles." on public.profiles;
drop policy if exists "Admins can update all profiles." on public.profiles;
drop policy if exists "Admins can delete all profiles." on public.profiles;

-- 3. Re-create policies using the safe function
create policy "Admins can view all profiles." on public.profiles
  for select using (public.is_admin());

create policy "Admins can update all profiles." on public.profiles
  for update using (public.is_admin());

create policy "Admins can delete all profiles." on public.profiles
  for delete using (public.is_admin());

-- 4. Ensure basic user access still exists (if not already present)
-- Users can read their own profile to see their role is safe because 
-- "Public profiles are viewable by everyone" covers it, or specific per-user policies.
-- Refinining "Public profiles..." to be safe if you want to restrict it later:
-- (Optional: You can keep the existing public read policy if you want profiles to be public)
-- For now, we continually rely on the existing "Public profiles are viewable by everyone." 
-- or similar that was in the original schema.
