create table if not exists public.bookings (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  training_type_id uuid not null references public.training_types (id) on delete cascade,
  start_time timestamp with time zone not null,
  status text not null default 'confirmed', -- confirmed, cancelled
  
  constraint bookings_pkey primary key (id)
);

-- RLS Policies
alter table public.bookings enable row level security;

create policy "Users can view their own bookings" on public.bookings
  for select using (auth.uid() = user_id);

create policy "Admins can view all bookings" on public.bookings
  for select using (public.is_admin());

create policy "Users can insert their own bookings" on public.bookings
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own bookings" on public.bookings
  for update using (auth.uid() = user_id);
  
-- Allow viewing counts/occupancy (publicly or authenticated)
-- Ideally we want to count bookings for a slot without exposing user_ids.
-- For now, we'll allow authenticated users to view bookings to count them (client-side or server-side).
-- A better approach for privacy is a security definer function or view, but for MVP:
create policy "Authenticated users can view bookings (for occupancy)" on public.bookings
  for select using (auth.role() = 'authenticated');
