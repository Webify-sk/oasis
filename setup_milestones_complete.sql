-- 1. Create Milestones Table (if not exists)
create table if not exists public.milestones (
    id serial primary key,
    training_count_required int unique not null,
    title text not null,
    subtitle text,
    description text,
    reward_credits int default 0,
    created_at timestamptz default now()
);

-- Add new columns if they don't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'milestones' and column_name = 'reward_type') then
        alter table public.milestones add column reward_type text check (reward_type in ('credits', 'service', 'discount', 'bundle'));
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'milestones' and column_name = 'reward_config') then
        alter table public.milestones add column reward_config jsonb default '{}'::jsonb;
    end if;
end $$;


-- 2. Create User Milestones Table (Log of unlocked ones)
create table if not exists public.user_milestones (
    user_id uuid references public.profiles(id) on delete cascade not null,
    milestone_id int references public.milestones(id) on delete cascade not null,
    unlocked_at timestamptz default now(),
    primary key (user_id, milestone_id)
);

-- 3. Create User Rewards Table (for non-credit rewards)
create table if not exists public.user_rewards (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    milestone_id int references public.milestones(id) on delete set null,
    description text not null,
    is_redeemed boolean default false,
    redeemed_at timestamptz,
    created_at timestamptz default now()
);

-- 4. Update Profiles Table (for lifetime discount)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'lifetime_discount') then
        alter table public.profiles add column lifetime_discount numeric(5,2) default 0;
    end if;
end $$;

-- 5. Enable RLS
alter table public.milestones enable row level security;
alter table public.user_milestones enable row level security;
alter table public.user_rewards enable row level security;

-- Policies
drop policy if exists "Milestones are viewable by everyone" on public.milestones;
create policy "Milestones are viewable by everyone" on public.milestones for select using (true);

drop policy if exists "Users can view their own milestones" on public.user_milestones;
create policy "Users can view their own milestones" on public.user_milestones for select using (auth.uid() = user_id);

drop policy if exists "Users can view their own rewards" on public.user_rewards;
create policy "Users can view their own rewards" on public.user_rewards for select using (auth.uid() = user_id);


-- 6. Trigger Function to Check Milestones on Booking
create or replace function public.check_milestone_unlock()
returns trigger as $$
declare
    v_count int;
    v_milestone record;
    v_reward_config jsonb;
begin
    -- Count confirmed bookings for this user
    select count(*) into v_count
    from public.bookings
    where user_id = NEW.user_id
    and status = 'confirmed';

    -- Find matching milestone
    select * into v_milestone
    from public.milestones
    where training_count_required = v_count;

    -- If match found, and not already unlocked
    if v_milestone.id is not null then
        if not exists (select 1 from public.user_milestones where user_id = NEW.user_id and milestone_id = v_milestone.id) then
            
            -- Log unlock
            insert into public.user_milestones (user_id, milestone_id)
            values (NEW.user_id, v_milestone.id);

            v_reward_config := v_milestone.reward_config;

            -- Process Reward Type
            if v_milestone.reward_type = 'credits' then
                update public.profiles 
                set credits = coalesce(credits, 0) + (v_reward_config->>'credits')::int
                where id = NEW.user_id;

            elsif v_milestone.reward_type = 'service' then
                insert into public.user_rewards (user_id, milestone_id, description)
                values (NEW.user_id, v_milestone.id, v_reward_config->>'description');

            elsif v_milestone.reward_type = 'discount' then
                 update public.profiles 
                 set lifetime_discount = (v_reward_config->>'discount_percent')::numeric
                 where id = NEW.user_id;

            elsif v_milestone.reward_type = 'bundle' then
                if v_reward_config ? 'credits' then
                    update public.profiles 
                    set credits = coalesce(credits, 0) + (v_reward_config->>'credits')::int
                    where id = NEW.user_id;
                end if;
                if v_reward_config ? 'service_description' then
                    insert into public.user_rewards (user_id, milestone_id, description)
                    values (NEW.user_id, v_milestone.id, v_reward_config->>'service_description');
                end if;
                if v_reward_config ? 'discount_percent' then
                    update public.profiles 
                    set lifetime_discount = (v_reward_config->>'discount_percent')::numeric
                    where id = NEW.user_id;
                end if;
            end if;

        end if;
    end if;

    return NEW;
end;
$$ language plpgsql security definer;

-- 7. Create Trigger
drop trigger if exists on_booking_milestone_check on public.bookings;
create trigger on_booking_milestone_check
    after insert on public.bookings
    for each row
    execute function public.check_milestone_unlock();

-- 8. Seed Data
insert into public.milestones (training_count_required, title, subtitle, description, reward_type, reward_config)
values 
  (50, 'Core Commitment', '2 vstupy grátis', 'Získavaš 2 vstupy grátis ako odmenu za vernosť.', 'credits', '{"credits": 2}'),
  (100, 'Inner Glow Achiever', 'Telové alebo pleťové ošetrenie grátis', 'Vyber si telové alebo pleťové ošetrenie podľa vlastného výberu.', 'service', '{"description": "Telové alebo pleťové ošetrenie grátis"}'),
  (150, 'Elite Flow', '5 vstupov grátis + ošetrenie', '5 vstupov na cvičenie a jedno telové alebo pleťové ošetrenie.', 'bundle', '{"credits": 5, "service_description": "Telové alebo pleťové ošetrenie grátis"}'),
  (200, 'Oasis Icon', '10% zľava + 10 vstupov + ošetrenie', 'Doživotná zľava 10%, 10 vstupov a ošetrenie grátis.', 'bundle', '{"credits": 10, "discount_percent": 10, "service_description": "Telové alebo pleťové ošetrenie grátis"}')
on conflict (training_count_required) do update set
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    reward_type = EXCLUDED.reward_type,
    reward_config = EXCLUDED.reward_config;
