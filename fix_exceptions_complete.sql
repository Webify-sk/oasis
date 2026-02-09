-- Complete Fix for employee_availability_exceptions

-- 1. Drop ALL existing policies to avoid dependencies during schema change
DROP POLICY IF EXISTS "Exceptions are viewable by everyone" ON public.employee_availability_exceptions;
DROP POLICY IF EXISTS "Authenticated users can insert exceptions" ON public.employee_availability_exceptions;
DROP POLICY IF EXISTS "Authenticated users can update exceptions" ON public.employee_availability_exceptions;
DROP POLICY IF EXISTS "Authenticated users can delete exceptions" ON public.employee_availability_exceptions;
-- Drop the policy mentioned in the error, just in case
DROP POLICY IF EXISTS "Employees can manage their own exceptions" ON public.employee_availability_exceptions;

-- 2. Fix the Foreign Key Constraint
-- Drop the incorrect constraint
ALTER TABLE public.employee_availability_exceptions 
DROP CONSTRAINT IF EXISTS employee_availability_exceptions_employee_id_fkey;

-- Add the correct constraint referencing 'employees' table
ALTER TABLE public.employee_availability_exceptions
ADD CONSTRAINT employee_availability_exceptions_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES public.employees(id)
ON DELETE CASCADE;

-- 3. Re-enable RLS and recreate policies
ALTER TABLE public.employee_availability_exceptions ENABLE ROW LEVEL SECURITY;

-- Read: Everyone
CREATE POLICY "Exceptions are viewable by everyone" 
    ON public.employee_availability_exceptions FOR SELECT 
    USING (true);

-- Insert: Authenticated users (Staff)
-- We check if the user is authenticated. 
-- Ideally we'd check if they are an employee in the DB, but for now 'authenticated' + app logic is okay.
CREATE POLICY "Authenticated users can insert exceptions" 
    ON public.employee_availability_exceptions FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Update: Authenticated users
CREATE POLICY "Authenticated users can update exceptions" 
    ON public.employee_availability_exceptions FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- Delete: Authenticated users
CREATE POLICY "Authenticated users can delete exceptions" 
    ON public.employee_availability_exceptions FOR DELETE 
    USING (auth.role() = 'authenticated');
