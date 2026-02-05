-- Add role column to profiles if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'role') then
        alter table public.profiles add column role text default 'client' check (role in ('client', 'employee', 'admin'));
    end if;
end $$;

-- Create cosmetic_services table
create table if not exists public.cosmetic_services (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    duration_minutes integer not null,
    price numeric(10,2) not null,
    currency text default 'EUR',
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create employees table
create table if not exists public.employees (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete set null, -- Optional link to auth user
    name text not null,
    bio text,
    color text default '#5E715D',
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Junction table for employee <-> services
create table if not exists public.employee_services (
    employee_id uuid references public.employees(id) on delete cascade,
    service_id uuid references public.cosmetic_services(id) on delete cascade,
    primary key (employee_id, service_id)
);

-- Employee availability (Weekly recurring + specific dates)
create table if not exists public.employee_availability (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid references public.employees(id) on delete cascade not null,
    day_of_week integer check (day_of_week between 0 and 6), -- 0=Sun, 1=Mon...
    start_time time without time zone,
    end_time time without time zone,
    is_recurring boolean default true,
    specific_date date, -- If set, overrides day_of_week
    is_available boolean default true, -- Can be used to block off time (False)
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Cosmetic appointments
create table if not exists public.cosmetic_appointments (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete set null, -- Client
    employee_id uuid references public.employees(id) on delete set null,
    service_id uuid references public.cosmetic_services(id) on delete set null,
    start_time timestamp with time zone not null,
    end_time timestamp with time zone not null,
    status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.cosmetic_services enable row level security;
alter table public.employees enable row level security;
alter table public.employee_services enable row level security;
alter table public.employee_availability enable row level security;
alter table public.cosmetic_appointments enable row level security;

-- Simple public read policies for now (refine for admin later)
create policy "Services are viewable by everyone" on public.cosmetic_services for select using (true);
create policy "Employees are viewable by everyone" on public.employees for select using (true);
create policy "Employee services are viewable by everyone" on public.employee_services for select using (true);
create policy "Availability is viewable by everyone" on public.employee_availability for select using (true);

-- Appointment policies
create policy "Users can view own appointments" on public.cosmetic_appointments
    for select using (auth.uid() = user_id);

create policy "Users can insert own appointments" on public.cosmetic_appointments
    for insert with check (auth.uid() = user_id);
