-- Package C — database-level guards against races and bad writes.
-- NON-DESTRUCTIVE: adds a function, a trigger, constraints and an index. No row is modified.
-- Every guard that could clash with historical data is limited to rows created/starting after
-- 2026-10-28, so it can never fail on what is already in the tables.
-- Reverse with 2026-10-21-integrity-C-down.sql.
--
-- Deploy together with the application commit that calls adjust_credit_batch().

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Atomic credit adjustment. The app used to read remaining_amount and write
--    it back; two parallel bookings both read 1 and both wrote 0 (lost update).
--    Returns the new balance, or NULL when the batch did not have enough.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_credit_batch(p_batch_id uuid, p_delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new numeric;
BEGIN
    UPDATE public.credit_batches
       SET remaining_amount = remaining_amount + p_delta
     WHERE id = p_batch_id
       AND remaining_amount + p_delta >= 0
    RETURNING remaining_amount INTO v_new;
    RETURN v_new;
END
$$;

REVOKE ALL ON FUNCTION public.adjust_credit_batch(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_credit_batch(uuid, numeric) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. participants_count must be at least 1 (verified: no existing row violates it).
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_participants_positive CHECK (participants_count >= 1);

-- ---------------------------------------------------------------------------
-- 3. One booking per client per session. Two historical duplicates exist and
--    are left alone: the index only covers rows created from today on.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX bookings_one_per_user_session
    ON public.bookings (user_id, training_type_id, start_time)
    WHERE created_at > '2026-10-28';

-- ---------------------------------------------------------------------------
-- 4. Capacity enforced inside the database. The advisory lock serialises
--    concurrent inserts for the same session, so two clients can no longer
--    both take the last spot. The app maps 'capacity_exceeded' to its message.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_training_capacity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_cap   integer;
    v_taken integer;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.training_type_id::text || NEW.start_time::text));

    SELECT COALESCE(capacity, 10) INTO v_cap
      FROM public.training_types WHERE id = NEW.training_type_id;

    SELECT COALESCE(SUM(participants_count), 0) INTO v_taken
      FROM public.bookings
     WHERE training_type_id = NEW.training_type_id
       AND start_time = NEW.start_time
       AND status <> 'cancelled'
       AND id <> NEW.id;

    IF v_taken + NEW.participants_count > v_cap THEN
        RAISE EXCEPTION 'capacity_exceeded' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_enforce_training_capacity ON public.bookings;
CREATE TRIGGER trg_enforce_training_capacity
    BEFORE INSERT OR UPDATE OF participants_count, start_time, training_type_id
    ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.enforce_training_capacity();

-- ---------------------------------------------------------------------------
-- 5. No two appointments of one employee may overlap, 15-minute gap included
--    (range starts 15 min early so adjacent bookings need the gap). New rows
--    only; the app already handles error code 23P01 with a friendly message.
--    Device and room limits stay in the application.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.cosmetic_appointments
    ADD CONSTRAINT cosmetic_appointments_no_employee_overlap
    EXCLUDE USING gist (
        employee_id WITH =,
        tstzrange(start_time - interval '15 minutes', end_time) WITH &&
    )
    WHERE (status <> 'cancelled' AND employee_id IS NOT NULL AND start_time > '2026-10-28');

COMMIT;
