-- Create credit_packages table
create table if not exists credit_packages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price numeric not null, -- Stored in Euros (e.g., 27.00)
  credits integer not null,
  bonus_credits integer default 0,
  description text,
  validity_months integer,
  is_active boolean default true,
  is_popular boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table credit_packages enable row level security;

-- Policies
create policy "Public read access"
  on credit_packages for select
  using (true);

create policy "Admin full access"
  on credit_packages for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Seed data (migration from hardcoded constants)
insert into credit_packages (title, price, credits, description, validity_months, is_popular)
values 
('Oasis Intro Pass', 27, 1, 'Vyskúšajte atmosféru Oasis Lounge. Ideálne pre prvú návštevu.', 1, false),
('Oasis Flow Pass', 125, 5, 'Pre tých, ktorí chcú zaradiť pohyb do svojho života.', 2, false),
('Oasis Core Pass', 230, 10, 'Náš najobľúbenejší balíček pre pravidelný tréning.', 4, true),
('Oasis Balance Builder', 500, 25, 'Maximálna flexibilita a najlepšia cena za vstup pre odhodlaných. Platnosť 9 mesiacov.', 9, false),
('Oasis Unlimited', 2500, 999999, 'Jeden rok neobmedzeného pohybu a relaxu. Movement Pass.', 12, false);
