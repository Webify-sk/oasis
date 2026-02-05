-- 1. Add email column to employees
alter table public.employees add column if not exists email text unique;

-- 2. Function to link profile <-> employee on registration (or profile update)
-- 2. Function to link profile <-> employee on registration (or profile update)
-- (Simplified for manual promotion: We will handle this via Server Action, but this trigger keeps data consistent if email changes)
create or replace function public.link_employee_profile()
returns trigger as $$
begin
    -- If this profile has role 'employee', ensure an employee record exists or is linked
    -- (Actually, for manual flow, we just rely on the 'employees.profile_id' Foreign Key)
    
    -- Sync email updates: if profile email changes, update employee email if linked
    if old.email is distinct from new.email then
        update public.employees set email = new.email where profile_id = new.id;
    end if;

    return new;
end;
$$ language plpgsql security definer;

-- 3. Trigger on Profiles
drop trigger if exists on_profile_link_employee on public.profiles;
create trigger on_profile_link_employee
before update on public.profiles
for each row execute function public.link_employee_profile();

-- 4. RLS Policy Updates
-- Allow employees to update their own availability
create policy "Employees can manage own availability"
on public.employee_availability
for all
using (
    employee_id in (select id from public.employees where profile_id = auth.uid())
);

-- Allow employees to view appointments assigned to them
create policy "Employees can view own assigned appointments"
on public.cosmetic_appointments
for select
using (
    employee_id in (select id from public.employees where profile_id = auth.uid())
);
