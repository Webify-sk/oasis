-- Enable RLS for employee_availability_exceptions
ALTER TABLE public.employee_availability_exceptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Exceptions are viewable by everyone" ON public.employee_availability_exceptions;
DROP POLICY IF EXISTS "Authenticated users can insert exceptions" ON public.employee_availability_exceptions;
DROP POLICY IF EXISTS "Authenticated users can update exceptions" ON public.employee_availability_exceptions;
DROP POLICY IF EXISTS "Authenticated users can delete exceptions" ON public.employee_availability_exceptions;

-- Create Policies

-- 1. Read: Everyone can see exceptions (clients need to see if employee is off)
CREATE POLICY "Exceptions are viewable by everyone" 
    ON public.employee_availability_exceptions FOR SELECT 
    USING (true);

-- 2. Insert: Authenticated users (Staff)
CREATE POLICY "Authenticated users can insert exceptions" 
    ON public.employee_availability_exceptions FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 3. Update: Authenticated users
CREATE POLICY "Authenticated users can update exceptions" 
    ON public.employee_availability_exceptions FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- 4. Delete: Authenticated users
CREATE POLICY "Authenticated users can delete exceptions" 
    ON public.employee_availability_exceptions FOR DELETE 
    USING (auth.role() = 'authenticated');
