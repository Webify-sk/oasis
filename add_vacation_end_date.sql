ALTER TABLE public.employee_availability_exceptions 
ADD COLUMN end_date date NULL;

COMMENT ON COLUMN public.employee_availability_exceptions.end_date IS 'Optional end date for a multi-day exception (e.g. vacation). If null, exception is for a single day (exception_date).';
