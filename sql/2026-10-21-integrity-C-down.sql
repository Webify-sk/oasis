-- Rollback of 2026-10-21-integrity-C-up.sql. Removes the guards; touches no rows.
-- The btree_gist extension is left installed (harmless, and other objects may rely on it).

BEGIN;

ALTER TABLE public.cosmetic_appointments
    DROP CONSTRAINT IF EXISTS cosmetic_appointments_no_employee_overlap;

DROP TRIGGER IF EXISTS trg_enforce_training_capacity ON public.bookings;
DROP FUNCTION IF EXISTS public.enforce_training_capacity();

DROP INDEX IF EXISTS public.bookings_one_per_user_session;

ALTER TABLE public.bookings
    DROP CONSTRAINT IF EXISTS bookings_participants_positive;

DROP FUNCTION IF EXISTS public.adjust_credit_batch(uuid, numeric);

COMMIT;
