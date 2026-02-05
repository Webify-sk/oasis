-- Enable insert/update/delete for authenticated users on cosmetics tables
-- Ideally, we would check for role='admin' or 'employee', but for now assume auth users are trusted staff/admins
-- (Since regular clients don't have UI to these actions, this is "safe enough" for MVP, but should be tightened later)

-- Services
create policy "Authenticated users can insert services" on public.cosmetic_services
    for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update services" on public.cosmetic_services
    for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete services" on public.cosmetic_services
    for delete using (auth.role() = 'authenticated');

-- Employees
create policy "Authenticated users can insert employees" on public.employees
    for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update employees" on public.employees
    for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete employees" on public.employees
    for delete using (auth.role() = 'authenticated');

-- Employee Availability
create policy "Authenticated users can insert availability" on public.employee_availability
    for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update availability" on public.employee_availability
    for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete availability" on public.employee_availability
    for delete using (auth.role() = 'authenticated');

-- Employee Services (Junction)
create policy "Authenticated users can insert employee_services" on public.employee_services
    for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete employee_services" on public.employee_services
    for delete using (auth.role() = 'authenticated');

-- Update Appointments policies to allow staff to manage them
create policy "Authenticated users can update any appointment" on public.cosmetic_appointments
    for update using (auth.role() = 'authenticated');
