-- 1. Create Credit Packages Table (if not exists)
create table if not exists public.credit_packages (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    price numeric(10,2) not null,
    credits int not null,
    bonus_credits int default 0,
    description text,
    validity_months int, -- null = unlimited
    is_active boolean default true,
    is_popular boolean default false,
    created_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.credit_packages enable row level security;

-- 3. Allow Public Read Access
-- This is critical for the embed to work without login
drop policy if exists "Credit packages are viewable by everyone" on public.credit_packages;
create policy "Credit packages are viewable by everyone" on public.credit_packages
    for select using (true);

-- 4. Policies for Admins (Manage)
-- Assuming you have an is_admin() function or similar logic
create policy "Admins can manage credit packages" on public.credit_packages
    for all using (public.is_admin());


-- 5. Seed Data (based on your design image)
-- Only inserts if table is empty to avoid duplicates
do $$
begin
    if not exists (select 1 from public.credit_packages) then
        
        insert into public.credit_packages (title, credits, price, validity_months, description, is_active, is_popular)
        values
        ('Oasis Intro Pass', 1, 27.00, 1, 'Vstupná brána do sveta Oasis. Ideálne na vyskúšanie.', true, false),
        
        ('Oasis Flow Pass', 5, 125.00, 2, 'Pravidelný pohyb pre lepšiu kondíciu a čistú myseľ.', true, true),
        
        ('Oasis Core Pass', 10, 230.00, 5, 'Váš záväzok k silnejšiemu a zdravšiemu ja.', true, false),
        
        ('Oasis Balance Builder Pass', 25, 500.00, 9, 'Dlhodobá investícia do vášho zdravia a rovnováhy.', true, false),

        ('Oasis Unlimited Movement Pass', 1000, 2500.00, 12, 'Neobmedzený prístup na celý rok. Pre tých, ktorí chcú maximum.', true, false);

        -- Note: The 'Private Experience' might be a different entity or just a package with special description
        insert into public.credit_packages (title, credits, price, validity_months, description, is_active)
        values ('Oasis Private Experience (1 osoba)', 1, 60.00, 3, 'Individuálny tréning pre 1 osobu.', true);

    end if;
end $$;
