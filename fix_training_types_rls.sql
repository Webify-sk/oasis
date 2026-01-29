-- Add missing RLS policies for the training_types table

-- Enable RLS (just in case)
alter table public.training_types enable row level security;

-- Allow public read access (so everyone can see training types)
create policy "Training types are viewable by everyone." on public.training_types
  for select using (true);

-- Allow admins to insert new training types
create policy "Admins can insert training types." on public.training_types
  for insert with check (public.is_admin());

-- Allow admins to update training types
create policy "Admins can update training types." on public.training_types
  for update using (public.is_admin());

-- Allow admins to delete training types
create policy "Admins can delete training types." on public.training_types
  for delete using (public.is_admin());
