-- Add guest fields to cosmetic_appointments
ALTER TABLE public.cosmetic_appointments
ADD COLUMN IF NOT EXISTS client_name text,
ADD COLUMN IF NOT EXISTS client_email text,
ADD COLUMN IF NOT EXISTS client_phone text;
