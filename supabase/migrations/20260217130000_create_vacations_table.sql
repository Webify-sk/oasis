create table if not exists public.vacations (
  id uuid not null default gen_random_uuid(),
  start_time timestamptz not null,
  end_time timestamptz not null,
  description text,
  created_at timestamptz default now(),
  primary key (id)
);

alter table public.vacations enable row level security;

create policy "Enable read access for all users"
on public.vacations
for select
using (true);

create policy "Enable insert for authenticated users only"
on public.vacations
for insert
with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only"
on public.vacations
for update
using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only"
on public.vacations
for delete
using (auth.role() = 'authenticated');
