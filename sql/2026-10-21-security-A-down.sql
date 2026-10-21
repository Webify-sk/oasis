-- Rollback of 2026-10-21-security-A-up.sql — restores the policies exactly as they were
-- (texts taken from migration_phase2.sql, fix_permissions.sql, fix_exceptions_complete.sql and
-- supabase/migrations/20260303084738_remote_schema.sql).  Touches policies only, never rows.

BEGIN;

-- 1. cosmetic_appointments
DROP POLICY IF EXISTS "Clients can cancel their own appointments" ON public.cosmetic_appointments;
CREATE POLICY "Authenticated users can update any appointment"
    ON public.cosmetic_appointments
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- 2. credit_batches / booking_deductions
DROP POLICY IF EXISTS "Admins manage credit batches" ON public.credit_batches;
CREATE POLICY "Enable all for admins and service roles"
    ON public.credit_batches
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage booking deductions" ON public.booking_deductions;
DROP POLICY IF EXISTS "Users can read deductions of their own bookings" ON public.booking_deductions;
CREATE POLICY "Enable all for admins and service roles"
    ON public.booking_deductions
    USING (true)
    WITH CHECK (true);

-- 3. employee_availability_exceptions
DROP POLICY IF EXISTS "Owner or admin can insert exceptions" ON public.employee_availability_exceptions;
DROP POLICY IF EXISTS "Owner or admin can update exceptions" ON public.employee_availability_exceptions;
DROP POLICY IF EXISTS "Owner or admin can delete exceptions" ON public.employee_availability_exceptions;
CREATE POLICY "Authenticated users can insert exceptions"
    ON public.employee_availability_exceptions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update exceptions"
    ON public.employee_availability_exceptions FOR UPDATE
    USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete exceptions"
    ON public.employee_availability_exceptions FOR DELETE
    USING (auth.role() = 'authenticated');

-- 4. training_session_exceptions / vacations
DROP POLICY IF EXISTS "Staff manage session exceptions" ON public.training_session_exceptions;
CREATE POLICY "Enable insert for authenticated users only"
    ON public.training_session_exceptions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only"
    ON public.training_session_exceptions FOR UPDATE
    USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only"
    ON public.training_session_exceptions FOR DELETE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff manage vacations" ON public.vacations;
CREATE POLICY "Enable insert for authenticated users only"
    ON public.vacations FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only"
    ON public.vacations FOR UPDATE
    USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only"
    ON public.vacations FOR DELETE
    USING (auth.role() = 'authenticated');

COMMIT;
