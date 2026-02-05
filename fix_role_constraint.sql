-- Fix for "violates check constraint profiles_role_check"

-- 1. Drop the old restrictive constraint
alter table public.profiles drop constraint if exists profiles_role_check;

-- 2. Add the new relaxed constraint allowing 'employee' and both 'user'/'client' variations just in case
alter table public.profiles 
add constraint profiles_role_check 
check (role in ('user', 'client', 'employee', 'admin'));

-- 3. Also ensuring the employee table has the role_type column if it was missing (based on previous action usage)
alter table public.employees add column if not exists role_type text default 'employee';
