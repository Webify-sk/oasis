-- 1. Create Milestones Definition Table
create table if not exists public.milestones (
    id serial primary key,
    training_count_required int unique not null,
    title text not null,
    subtitle text,
    description text,
    reward_credits int default 0,
    created_at timestamptz default now()
);

-- 2. Create User Milestones (Log of unlocked ones)
create table if not exists public.user_milestones (
    user_id uuid references public.profiles(id) on delete cascade not null,
    milestone_id int references public.milestones(id) on delete cascade not null,
    unlocked_at timestamptz default now(),
    primary key (user_id, milestone_id)
);

-- 3. Seed Data (50, 100, 150, 200)
insert into public.milestones (training_count_required, title, subtitle, description)
values 
  (50, 'Rozbiehaš sa', '50 Tréningov', 'Absolvoval si svojich prvých 50 tréningov.'),
  (100, 'Stovka', '100 Tréningov', 'Dosiahol si magickú hranicu 100 tréningov!'),
  (150, 'Nezastaviteľný', '150 Tréningov', 'Tvoja disciplína je obdivuhodná.'),
  (200, 'Legenda', '200 Tréningov', 'Si skutočnou legendou Oasis Lounge.')
on conflict (training_count_required) do nothing;

-- 4. Enable RLS
alter table public.milestones enable row level security;
alter table public.user_milestones enable row level security;

-- Policies
create policy "Milestones are viewable by everyone" on public.milestones for select using (true);
create policy "Users can view their own milestones" on public.user_milestones for select using (auth.uid() = user_id);

-- 5. Trigger Function to Check Milestones on Booking
create or replace function public.check_milestone_unlock()
returns trigger as $$
declare
    v_count int;
    v_milestone_id int;
begin
    -- Count total confirmed bookings for this user
    -- We assume existence in 'bookings' table means registered/confirmed
    select count(*) into v_count
    from public.bookings
    where user_id = NEW.user_id;

    -- Check if this count matches a milestone requirement
    select id into v_milestone_id
    from public.milestones
    where training_count_required = v_count;

    -- If match found, insert into user_milestones if not exists
    if v_milestone_id is not null then
        insert into public.user_milestones (user_id, milestone_id)
        values (NEW.user_id, v_milestone_id)
        on conflict do nothing;
    end if;

    return NEW;
end;
$$ language plpgsql security definer;

-- 6. Create Trigger
drop trigger if exists on_booking_milestone_check on public.bookings;
create trigger on_booking_milestone_check
    after insert on public.bookings
    for each row
    execute function public.check_milestone_unlock();
