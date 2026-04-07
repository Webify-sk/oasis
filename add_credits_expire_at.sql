-- Pridá stĺpec pre zaznamenanie dátumu expirácie štandardných kreditov
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_expire_at timestamp with time zone;
