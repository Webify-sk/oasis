-- =====================================================================
-- Oasis Lounge — odhlásenie z newslettera
-- Spustiť v Supabase → SQL Editor PRED nasadením kódu.
--
-- Čo robí:
--   pridá do profiles príznak odberu newslettera a čas odhlásenia.
--   Všetci existujúci používatelia zostávajú prihlásení na odber (ako doteraz),
--   odhlásia sa odkazom v pätičke newslettera.
--
-- Čo NEROBÍ: nič nemaže, nemení žiadne existujúce hodnoty v riadkoch.
-- Dá sa spustiť opakovane. Vrátenie: 2026-11-27-newsletter-unsubscribe-down.sql
-- =====================================================================

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS newsletter_unsubscribed_at timestamptz;

COMMIT;
