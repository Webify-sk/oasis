-- Prepojenie účtu trénerky Henriety na jej pôvodný záznam.
--
-- SPUSTIŤ AŽ PO POTVRDENÍ KLIENTKY, že záznam „Henrieta" (má rozvrh, nemá účet)
-- a „Henrieta Novotna" (má účet, nemá rozvrh) sú tá istá osoba.
--
-- Čo skript robí: presunie prepojenie na účet (profile_id), e-mail a telefón zo záznamu
-- „Henrieta Novotna" na záznam „Henrieta".
--
-- NIČ SA NEMAŽE. Rozvrh, rezervácie, dovolenky ani účty sa nemenia. Záznam „Henrieta
-- Novotna" v tabuľke ostane, len bez účtu a s menom doplneným o „(duplicitný záznam)".
--
-- Vrátenie: 2026-11-26-trainer-henrieta-down.sql
-- Spustiť v Supabase → SQL Editor ako jeden celok.

BEGIN;

-- Poistka: pokračuje len vtedy, keď dáta vyzerajú presne ako pri kontrole 26. 11.
-- Inak skončí chybou a nič sa nezmení.
DO $$
DECLARE
    v_refs integer;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.trainers
                    WHERE id = '151daa80-3cb4-4c33-9b4f-70a6ca09618c' AND profile_id IS NULL) THEN
        RAISE EXCEPTION 'Záznam „Henrieta" už má účet alebo neexistuje — nič sa nezmenilo.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.trainers
                    WHERE id = '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa' AND profile_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Záznam „Henrieta Novotna" nemá účet alebo neexistuje — nič sa nezmenilo.';
    END IF;

    SELECT (SELECT count(*) FROM public.bookings  WHERE trainer_id = '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa')
         + (SELECT count(*) FROM public.vacations WHERE trainer_id = '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa')
      INTO v_refs;
    IF v_refs <> 0 THEN
        RAISE EXCEPTION 'Na záznam „Henrieta Novotna" sú už naviazané rezervácie alebo dovolenky (%) — nič sa nezmenilo.', v_refs;
    END IF;
END
$$;

-- 1. Henrieta  <-  účet, e-mail a telefón z „Henrieta Novotna"
UPDATE public.trainers AS o
   SET profile_id = n.profile_id,
       email      = n.email,
       phone      = COALESCE(o.phone, n.phone)
  FROM public.trainers AS n
 WHERE o.id = '151daa80-3cb4-4c33-9b4f-70a6ca09618c'
   AND n.id = '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa';

-- 2. „Henrieta Novotna": odpojiť od účtu (jeden účet nesmie byť na dvoch záznamoch) a označiť.
--    Riadok ostáva; e-mail je už skopírovaný na pôvodný záznam.
UPDATE public.trainers
   SET profile_id = NULL,
       email      = NULL,
       full_name  = full_name || ' (duplicitný záznam)'
 WHERE id = '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa';

COMMIT;

-- Kontrola výsledku: „Henrieta" má mať ma_ucet = true, duplicitný záznam false.
SELECT full_name, (profile_id IS NOT NULL) AS ma_ucet, (email IS NOT NULL) AS ma_email
  FROM public.trainers
 WHERE id IN ('151daa80-3cb4-4c33-9b4f-70a6ca09618c', '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa')
 ORDER BY created_at;
