-- Ensure employee_availability table exists with correct columns
create table if not exists public.employee_availability (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid references public.employees(id) on delete cascade not null,
    day_of_week integer check (day_of_week between 0 and 6),
    start_time time without time zone,
    end_time time without time zone,
    is_recurring boolean default true,
    specific_date date,
    is_available boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.employee_availability enable row level security;

-- Drop existing policies to avoid conflicts/duplication and ensure specific permissions
drop policy if exists "Availability is viewable by everyone" on public.employee_availability;
drop policy if exists "Authenticated users can insert availability" on public.employee_availability;
drop policy if exists "Authenticated users can update availability" on public.employee_availability;
drop policy if exists "Authenticated users can delete availability" on public.employee_availability;

-- Re-create policies
create policy "Availability is viewable by everyone" 
    on public.employee_availability for select 
    using (true);

create policy "Authenticated users can insert availability" 
    on public.employee_availability for insert 
    with check (auth.role() = 'authenticated');

create policy "Authenticated users can update availability" 
    on public.employee_availability for update 
    using (auth.role() = 'authenticated');

create policy "Authenticated users can delete availability" 
    on public.employee_availability for delete 
    using (auth.role() = 'authenticated');

-- Verify columns exist (if table already existed but was missing columns)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'employee_availability' and column_name = 'specific_date') then
        alter table public.employee_availability add column specific_date date;
    end if;
     if not exists (select 1 from information_schema.columns where table_name = 'employee_availability' and column_name = 'is_available') then
        alter table public.employee_availability add column is_available boolean default true;
    end if;
end $$;
