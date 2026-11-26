-- =====================================================================
-- Vrátenie 2026-11-26-deactivation-up.sql
--
-- Krok 1 (trigger) je bezpečné vrátiť kedykoľvek.
-- Krok 2 (stĺpce) je zakomentovaný: zmazaním stĺpca by sa stratila informácia,
-- kto je deaktivovaný. Odkomentujte len vtedy, ak je späť nasadený aj starý kód.
-- Deaktivované účty ostanú zablokované v prihlasovaní (ban v Supabase Auth) —
-- pred vrátením ich aktivujte v admine.
-- =====================================================================

BEGIN;

-- 1. Trigger
DROP TRIGGER IF EXISTS protect_profile_privileged_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_privileged_columns();

-- 2. Stĺpce (voliteľné — pozri poznámku hore)
-- ALTER TABLE public.trainers DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_active;

COMMIT;
