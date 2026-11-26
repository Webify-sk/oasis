-- Prepojenie účtov trénerok na ich pôvodné záznamy.
--
-- Stav pred: 6. 11. 2026 vznikli nové záznamy „Viktória Hroudová" a „Henrieta Novotna"
-- s prihlasovacím účtom, ale rozvrh, rezervácie a história ostali na pôvodných záznamoch
-- „Viki S" a „Henrieta". Po prihlásení preto trénerky nevidia žiadne tréningy.
--
-- Čo skript robí: presunie prepojenie na účet (profile_id), e-mail a telefón z nového
-- záznamu na pôvodný.
--
-- NIČ SA NEMAŽE. Žiadny riadok sa neodstráni; rozvrh, rezervácie, dovolenky ani účty sa
-- nemenia. Nové (prázdne) záznamy zostanú v tabuľke, len bez účtu a s menom doplneným
-- o „(duplicitný záznam)", aby sa v admine nedali pomýliť. Zmazať ich môžete neskôr
-- ručne v admine, ak budete chcieť — nič na ne nie je naviazané.
--
-- Vrátenie: 2026-11-26-trainer-accounts-down.sql
-- Spustiť v Supabase → SQL Editor ako jeden celok.

BEGIN;

-- Poistka: skript pokračuje len vtedy, keď dáta vyzerajú presne tak, ako pri kontrole.
-- Ak nie (niekto to medzitým upravil v admine), skončí chybou a nič sa nezmení.
DO $$
DECLARE
    v_old_ok  integer;
    v_new_ok  integer;
    v_refs    integer;
BEGIN
    SELECT count(*) INTO v_old_ok FROM public.trainers
     WHERE id IN ('9f94f2ba-6ecd-4132-a22d-1f936a407be1', '151daa80-3cb4-4c33-9b4f-70a6ca09618c')
       AND profile_id IS NULL;

    SELECT count(*) INTO v_new_ok FROM public.trainers
     WHERE id IN ('fdd467a2-b64e-41f8-a59f-c6da633148fb', '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa')
       AND profile_id IS NOT NULL;

    SELECT (SELECT count(*) FROM public.bookings  WHERE trainer_id IN ('fdd467a2-b64e-41f8-a59f-c6da633148fb', '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa'))
         + (SELECT count(*) FROM public.vacations WHERE trainer_id IN ('fdd467a2-b64e-41f8-a59f-c6da633148fb', '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa'))
      INTO v_refs;

    IF v_old_ok <> 2 THEN
        RAISE EXCEPTION 'Pôvodné záznamy (Viki S, Henrieta) už majú účet alebo neexistujú — nič sa nezmenilo.';
    END IF;
    IF v_new_ok <> 2 THEN
        RAISE EXCEPTION 'Nové záznamy (Viktória Hroudová, Henrieta Novotna) nemajú účet alebo neexistujú — nič sa nezmenilo.';
    END IF;
    IF v_refs <> 0 THEN
        RAISE EXCEPTION 'Na nové záznamy sú už naviazané rezervácie alebo dovolenky (%) — treba ich najprv posúdiť, nič sa nezmenilo.', v_refs;
    END IF;
END
$$;

-- 1. Viki S  <-  účet, e-mail a telefón z „Viktória Hroudová"
UPDATE public.trainers AS o
   SET profile_id = n.profile_id,
       email      = n.email,
       phone      = COALESCE(o.phone, n.phone)
  FROM public.trainers AS n
 WHERE o.id = '9f94f2ba-6ecd-4132-a22d-1f936a407be1'
   AND n.id = 'fdd467a2-b64e-41f8-a59f-c6da633148fb';

-- 2. Henrieta  <-  účet, e-mail a telefón z „Henrieta Novotna"
UPDATE public.trainers AS o
   SET profile_id = n.profile_id,
       email      = n.email,
       phone      = COALESCE(o.phone, n.phone)
  FROM public.trainers AS n
 WHERE o.id = '151daa80-3cb4-4c33-9b4f-70a6ca09618c'
   AND n.id = '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa';

-- 3. Nové záznamy: odpojiť od účtu (inak by bol jeden účet na dvoch záznamoch) a označiť.
--    Riadky ostávajú, telefón na nich ostáva; e-mail je už skopírovaný na pôvodný záznam.
UPDATE public.trainers
   SET profile_id = NULL,
       email      = NULL,
       full_name  = full_name || ' (duplicitný záznam)'
 WHERE id IN ('fdd467a2-b64e-41f8-a59f-c6da633148fb', '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa');

COMMIT;

-- Kontrola výsledku (zobrazí sa pod skriptom): oba pôvodné záznamy majú mať účet.
SELECT full_name, (profile_id IS NOT NULL) AS ma_ucet, (email IS NOT NULL) AS ma_email
  FROM public.trainers
 WHERE id IN ('9f94f2ba-6ecd-4132-a22d-1f936a407be1', '151daa80-3cb4-4c33-9b4f-70a6ca09618c',
              'fdd467a2-b64e-41f8-a59f-c6da633148fb', '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa')
 ORDER BY created_at;
