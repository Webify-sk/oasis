-- Vrátenie 2026-11-26-trainer-henrieta-up.sql: účet, e-mail a meno späť do stavu pred
-- úpravou (účet na zázname „Henrieta Novotna", záznam „Henrieta" bez účtu). Nič sa nemaže.

BEGIN;

UPDATE public.trainers AS n
   SET profile_id = o.profile_id,
       email      = o.email,
       full_name  = replace(n.full_name, ' (duplicitný záznam)', '')
  FROM public.trainers AS o
 WHERE n.id = '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa'
   AND o.id = '151daa80-3cb4-4c33-9b4f-70a6ca09618c';

-- Pred úpravou nemal záznam „Henrieta" účet, e-mail ani telefón
UPDATE public.trainers
   SET profile_id = NULL,
       email      = NULL,
       phone      = NULL
 WHERE id = '151daa80-3cb4-4c33-9b4f-70a6ca09618c';

COMMIT;
