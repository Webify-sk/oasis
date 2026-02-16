create table if not exists public.training_session_exceptions (
  id uuid not null default gen_random_uuid(),
  training_type_id uuid not null references public.training_types(id) on delete cascade,
  session_start_time timestamptz not null,
  is_individual boolean default false,
  created_at timestamptz default now(),
  primary key (id),
  unique (training_type_id, session_start_time)
);

alter table public.training_session_exceptions enable row level security;

create policy "Enable read access for all users"
on public.training_session_exceptions
for select
using (true);

create policy "Enable insert for authenticated users only"
on public.training_session_exceptions
for insert
with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only"
on public.training_session_exceptions
for update
using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only"
on public.training_session_exceptions
for delete
using (auth.role() = 'authenticated');
