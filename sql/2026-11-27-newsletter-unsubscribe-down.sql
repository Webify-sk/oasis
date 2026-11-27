-- Vrátenie 2026-11-27-newsletter-unsubscribe-up.sql
-- POZOR: zmaže záznam o tom, kto sa z newslettera odhlásil. Pred spustením si
-- zoznam odhlásených odložte, inak im newsletter začne chodiť znova.

BEGIN;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS newsletter_unsubscribed_at;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS newsletter_subscribed;

COMMIT;
