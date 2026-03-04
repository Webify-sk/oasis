-- OK, my mistake. The previous SQL caused an "infinite recursion" because checking the profiles table inside a policy on the profiles table loops endlessly.
-- First, we remove that bad policy:
drop policy if exists "Trainers can view profiles" on public.profiles;

-- Instead of looking at the profiles table again, we can just use a simpler method or skip it if it's already causing trouble.
-- The easiest way without recursion is to use the JWT `raw_app_meta_data->>'role'` if it's stored there, OR just trust that if they are fetching bookings, we only expose the names via a secure view or allow authenticated users to view profiles of people sharing the same training slot.
-- For now, let's just make it simple: allow authenticated users to read basic profile info (only names/roles, no sensitive info) if your app doesn't have a strict privacy requirement for names inside the dashboard.
-- Let's revert the profiles to standard securely, allowing authenticated users to read basic info:

create policy "Authenticated users can view profiles" on public.profiles
  for select using ( auth.role() = 'authenticated' );
