-- Vrátenie 2026-11-26-trainer-accounts-up.sql: účty, e-maily a mená späť do stavu
-- pred úpravou (účet na nových záznamoch, pôvodné záznamy bez účtu). Nič sa nemaže.

BEGIN;

-- Nové záznamy dostanú späť účet, e-mail a pôvodné meno
UPDATE public.trainers AS n
   SET profile_id = o.profile_id,
       email      = o.email,
       full_name  = replace(n.full_name, ' (duplicitný záznam)', '')
  FROM public.trainers AS o
 WHERE n.id = 'fdd467a2-b64e-41f8-a59f-c6da633148fb'
   AND o.id = '9f94f2ba-6ecd-4132-a22d-1f936a407be1';

UPDATE public.trainers AS n
   SET profile_id = o.profile_id,
       email      = o.email,
       full_name  = replace(n.full_name, ' (duplicitný záznam)', '')
  FROM public.trainers AS o
 WHERE n.id = '7bd4abf0-ce76-4f40-8cc9-6cb8f56350fa'
   AND o.id = '151daa80-3cb4-4c33-9b4f-70a6ca09618c';

-- Pôvodné záznamy späť bez účtu (pred úpravou nemali účet, e-mail ani telefón)
UPDATE public.trainers
   SET profile_id = NULL,
       email      = NULL,
       phone      = NULL
 WHERE id IN ('9f94f2ba-6ecd-4132-a22d-1f936a407be1', '151daa80-3cb4-4c33-9b4f-70a6ca09618c');

COMMIT;
