-- Fix Foreign Key Constraint for employee_availability_exceptions

-- 1. Drop the incorrect constraint
-- The error message identified the constraint name: "employee_availability_exceptions_employee_id_fkey"
ALTER TABLE public.employee_availability_exceptions 
DROP CONSTRAINT IF EXISTS employee_availability_exceptions_employee_id_fkey;

-- 2. Add the correct constraint referencing 'employees' table
ALTER TABLE public.employee_availability_exceptions
ADD CONSTRAINT employee_availability_exceptions_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES public.employees(id)
ON DELETE CASCADE;

-- 3. Verify logic: ensuring the column type is uuid
ALTER TABLE public.employee_availability_exceptions
ALTER COLUMN employee_id TYPE uuid USING employee_id::uuid;
