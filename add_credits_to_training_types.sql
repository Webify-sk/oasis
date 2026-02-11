-- Add price_credits column to training_types table
alter table public.training_types
add column price_credits integer not null default 1;
