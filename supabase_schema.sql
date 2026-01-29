-- Create profiles table that extends auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  phone text,
  credits integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create trainers table
create table public.trainers (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  specialties text[] default '{}',
  bio text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create trainings (classes/sessions) table
create table public.trainings (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  trainer_id uuid references public.trainers(id) on delete set null,
  level text check (level in ('Začiatočník', 'Pokročilý', 'Všetky úrovne')),
  capacity integer default 8,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create registrations table (to track user signups)
create table public.registrations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  training_id uuid references public.trainings(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, training_id)
);

-- Create invoices table
create table public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  invoice_number text not null,
  amount numeric(10,2) not null,
  currency text default 'EUR',
  hours_purchased integer not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.trainers enable row level security;
alter table public.trainings enable row level security;
alter table public.registrations enable row level security;
alter table public.invoices enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Policies for trainers (Public read, Admin write - assuming simple public read for now)
create policy "Trainers are viewable by everyone." on public.trainers
  for select using (true);

-- Policies for trainings (Public read)
create policy "Trainings are viewable by everyone." on public.trainings
  for select using (true);

-- Policies for registrations
create policy "Users can view their own registrations." on public.registrations
  for select using (auth.uid() = user_id);

create policy "Users can insert their own registration." on public.registrations
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own registration." on public.registrations
  for delete using (auth.uid() = user_id);

-- Policies for invoices
create policy "Users can view their own invoices." on public.invoices
  for select using (auth.uid() = user_id);

-- Function to handle new user signup automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Insert dummy trainers
insert into public.trainers (full_name, specialties) values
('Anna Pekná', '{Pilates, Joga}'),
('Peter Silný', '{Silový tréning, Mobilita}');
