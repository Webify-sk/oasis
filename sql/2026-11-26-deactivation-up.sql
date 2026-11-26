-- =====================================================================
-- Oasis Lounge — deaktivácia namiesto mazania + ochrana citlivých stĺpcov profilu
-- Spustiť v Supabase → SQL Editor PRED nasadením kódu.
--
-- Čo robí:
--   1. pridá stĺpec is_active do trainers a profiles (všetci existujúci = aktívni)
--   2. pridá trigger, ktorý bežnému prihlásenému používateľovi nedovolí zmeniť si
--      vlastnú rolu, kredity, platnosť ani stav účtu priamo cez API
--
-- Čo NEROBÍ: nič nemaže, nemení žiadne existujúce hodnoty v riadkoch.
-- Dá sa spustiť opakovane. Vrátenie: 2026-11-26-deactivation-down.sql
-- =====================================================================

BEGIN;

-- 1. Stĺpce -----------------------------------------------------------
ALTER TABLE public.trainers ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Ochrana citlivých stĺpcov ----------------------------------------
-- Politika „Users can update own profile.“ dovoľuje používateľovi upraviť celý svoj
-- riadok. Meno a telefón sú v poriadku; rola a kredity nie.
--
-- Trigger zasiahne LEN pri priamom zápise z prehliadača (rola authenticated / anon),
-- keď volajúci nie je admin. Server (service_role), admin a databázové funkcie
-- (redeem_voucher, míľniky — bežia ako vlastník) ním prejdú bez zmeny.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF current_user NOT IN ('authenticated', 'anon') THEN
        RETURN NEW;
    END IF;

    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF NEW.role                 IS DISTINCT FROM OLD.role
    OR NEW.is_active            IS DISTINCT FROM OLD.is_active
    OR NEW.credits              IS DISTINCT FROM OLD.credits
    OR NEW.credits_expire_at    IS DISTINCT FROM OLD.credits_expire_at
    OR NEW.unlimited_expires_at IS DISTINCT FROM OLD.unlimited_expires_at
    OR NEW.lifetime_discount    IS DISTINCT FROM OLD.lifetime_discount
    THEN
        RAISE EXCEPTION 'Zmena tohto údaja nie je povolená.' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

COMMIT;

-- Kontrola (len číta): oba počty „neaktivni“ majú byť 0 a trigger má existovať.
SELECT
    (SELECT count(*) FROM public.trainers)                          AS treneri,
    (SELECT count(*) FROM public.trainers WHERE NOT is_active)      AS treneri_neaktivni,
    (SELECT count(*) FROM public.profiles)                          AS ucty,
    (SELECT count(*) FROM public.profiles WHERE NOT is_active)      AS ucty_neaktivne,
    (SELECT count(*) FROM pg_trigger
      WHERE tgname = 'protect_profile_privileged_columns' AND NOT tgisinternal) AS trigger_existuje;
