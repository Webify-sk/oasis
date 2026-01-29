-- Create a new table for Training Definitions / Types
create table public.training_types (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  perex text, -- Short description from screenshot
  muscle_group text, -- "Svalová partia"
  level text check (level in ('Začiatočník', 'Pokročilý', 'Všetky úrovne')),
  capacity integer default 8,
  duration_minutes text, -- "Dĺžka tréningu" e.g. "50-80 minut"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on new table
alter table public.training_types enable row level security;

-- Policies for training_types
create policy "Training Types are viewable by everyone." on public.training_types
  for select using (true);
  
create policy "Admins can insert training types." on public.training_types
  for insert with check (public.is_admin());
  
create policy "Admins can update training types." on public.training_types
  for update using (public.is_admin());
  
create policy "Admins can delete training types." on public.training_types
  for delete using (public.is_admin());


-- Update existing trainings table to link to definitions
-- (We keep title/desc on trainings as a fallback or cache, OR we make them nullable)
alter table public.trainings 
add column if not exists training_type_id uuid references public.training_types(id) on delete cascade;

-- Optionally, we can drop separate title/desc from trainings later, 
-- but for now let's might keep them for independent sessions or migration.
