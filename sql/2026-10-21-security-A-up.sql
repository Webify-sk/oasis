-- Security package A — RLS fixes.  NON-DESTRUCTIVE: touches policies only, never rows.
-- Reverse with 2026-10-21-security-A-down.sql.
--
-- Deploy together with the application commit that moves credit bookkeeping and client
-- reschedules onto the service-role client; before that commit is live, clients could not
-- book trainings after this runs.
--
-- Run in Supabase → SQL editor as one batch.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. cosmetic_appointments: any signed-in user could UPDATE any row.
--    Staff keep "Employees and Admins can manage all appointments" (FOR ALL).
--    Clients may only mark their OWN appointment as cancelled.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can update any appointment" ON public.cosmetic_appointments;

CREATE POLICY "Clients can cancel their own appointments"
    ON public.cosmetic_appointments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- ---------------------------------------------------------------------------
-- 2. credit_batches / booking_deductions: "Enable all for admins and service roles"
--    had no role test at all → every client could rewrite their own credits.
--    The service role bypasses RLS anyway; admins get an explicit policy;
--    clients keep read-only access to their own rows.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable all for admins and service roles" ON public.credit_batches;

CREATE POLICY "Admins manage credit batches"
    ON public.credit_batches
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
-- "Enable read for users based on user_id" (SELECT, auth.uid() = user_id) stays as is.

DROP POLICY IF EXISTS "Enable all for admins and service roles" ON public.booking_deductions;

CREATE POLICY "Admins manage booking deductions"
    ON public.booking_deductions
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Users can read deductions of their own bookings"
    ON public.booking_deductions
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = booking_deductions.booking_id AND b.user_id = auth.uid()
    ));

-- ---------------------------------------------------------------------------
-- 3. employee_availability_exceptions: any signed-in user could delete/update
--    any employee's vacation. Owner (via employees.profile_id) or admin only.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can delete exceptions" ON public.employee_availability_exceptions;
DROP POLICY IF EXISTS "Authenticated users can update exceptions" ON public.employee_availability_exceptions;
DROP POLICY IF EXISTS "Authenticated users can insert exceptions" ON public.employee_availability_exceptions;

CREATE POLICY "Owner or admin can insert exceptions"
    ON public.employee_availability_exceptions
    FOR INSERT
    WITH CHECK (
        public.is_admin() OR
        employee_id IN (SELECT id FROM public.employees WHERE profile_id = auth.uid())
    );

CREATE POLICY "Owner or admin can update exceptions"
    ON public.employee_availability_exceptions
    FOR UPDATE
    USING (
        public.is_admin() OR
        employee_id IN (SELECT id FROM public.employees WHERE profile_id = auth.uid())
    );

CREATE POLICY "Owner or admin can delete exceptions"
    ON public.employee_availability_exceptions
    FOR DELETE
    USING (
        public.is_admin() OR
        employee_id IN (SELECT id FROM public.employees WHERE profile_id = auth.uid())
    );

-- ---------------------------------------------------------------------------
-- 4. training_session_exceptions / vacations: any signed-in user could mark a
--    session individual or create a studio-wide vacation. Staff only.
--    (Trainers carry role 'employee' in profiles.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.training_session_exceptions;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.training_session_exceptions;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.training_session_exceptions;

CREATE POLICY "Staff manage session exceptions"
    ON public.training_session_exceptions
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','employee')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','employee')));

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.vacations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.vacations;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.vacations;

CREATE POLICY "Staff manage vacations"
    ON public.vacations
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','employee')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','employee')));

COMMIT;
