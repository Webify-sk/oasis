-- Add missing RLS policies for the trainers table

-- Allow admins to insert new trainers
create policy "Admins can insert trainers." on public.trainers
  for insert with check (public.is_admin());

-- Allow admins to update trainers
create policy "Admins can update trainers." on public.trainers
  for update using (public.is_admin());

-- Allow admins to delete trainers
create policy "Admins can delete trainers." on public.trainers
  for delete using (public.is_admin());
