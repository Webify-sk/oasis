-- Add unlimited_expires_at column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS unlimited_expires_at timestamptz DEFAULT NULL;
