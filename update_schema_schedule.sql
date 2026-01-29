-- Add schedule column to training_types to store the "Terms" (Day, Time, Trainer)
alter table public.training_types 
add column if not exists schedule jsonb default '[]'::jsonb;
