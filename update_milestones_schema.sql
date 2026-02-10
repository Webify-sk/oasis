-- 1. Modify Milestones Table
alter table public.milestones
add column if not exists reward_type text check (reward_type in ('credits', 'service', 'discount', 'bundle')),
add column if not exists reward_config jsonb default '{}'::jsonb;

-- 2. Create User Rewards Table (for non-credit rewards like treatments)
create table if not exists public.user_rewards (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    milestone_id int references public.milestones(id) on delete set null,
    description text not null,
    is_redeemed boolean default false,
    redeemed_at timestamptz,
    created_at timestamptz default now()
);

-- RLS for user_rewards
alter table public.user_rewards enable row level security;
create policy "Users can view their own rewards" on public.user_rewards for select using (auth.uid() = user_id);

-- 3. Update Profiles Table (for lifetime discount)
alter table public.profiles
add column if not exists lifetime_discount numeric(5,2) default 0;

-- 4. Update Milestone Data
-- We need to clear existing milestones to avoid conflicts or update them. 
-- For simplicity in this script, we'll delete and re-insert or update.
-- Let's update incrementally to be safe.

-- Milestone 1: Core Commitment (50 trainings) -> 2 free entries
insert into public.milestones (training_count_required, title, subtitle, description, reward_type, reward_config)
values (50, 'Core Commitment', '2 vstupy grátis', 'Získavaš 2 vstupy grátis ako odmenu za vernosť.', 'credits', '{"credits": 2}')
on conflict (training_count_required) do update set
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    reward_type = EXCLUDED.reward_type,
    reward_config = EXCLUDED.reward_config;

-- Milestone 2: Inner Glow Achiever (100 trainings) -> Treatment
insert into public.milestones (training_count_required, title, subtitle, description, reward_type, reward_config)
values (100, 'Inner Glow Achiever', 'Telové alebo pleťové ošetrenie grátis', 'Vyber si telové alebo pleťové ošetrenie podľa vlastného výberu.', 'service', '{"description": "Telové alebo pleťové ošetrenie grátis"}')
on conflict (training_count_required) do update set
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    reward_type = EXCLUDED.reward_type,
    reward_config = EXCLUDED.reward_config;

-- Milestone 3: Elite Flow (150 trainings) -> 5 entries + Treatment
insert into public.milestones (training_count_required, title, subtitle, description, reward_type, reward_config)
values (150, 'Elite Flow', '5 vstupov grátis + ošetrenie', '5 vstupov na cvičenie a jedno telové alebo pleťové ošetrenie.', 'bundle', '{"credits": 5, "service_description": "Telové alebo pleťové ošetrenie grátis"}')
on conflict (training_count_required) do update set
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    reward_type = EXCLUDED.reward_type,
    reward_config = EXCLUDED.reward_config;

-- Milestone 4: Oasis Icon (200 trainings) -> 10% discount + 10 entries + Treatment
insert into public.milestones (training_count_required, title, subtitle, description, reward_type, reward_config)
values (200, 'Oasis Icon', '10% zľava + 10 vstupov + ošetrenie', 'Doživotná zľava 10%, 10 vstupov a ošetrenie grátis.', 'bundle', '{"credits": 10, "discount_percent": 10, "service_description": "Telové alebo pleťové ošetrenie grátis"}')
on conflict (training_count_required) do update set
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    reward_type = EXCLUDED.reward_type,
    reward_config = EXCLUDED.reward_config;


-- 5. Updated Trigger Function
create or replace function public.check_milestone_unlock()
returns trigger as $$
declare
    v_count int;
    v_milestone record;
    v_reward_config jsonb;
begin
    -- Count confirmed bookings
    select count(*) into v_count
    from public.bookings
    where user_id = NEW.user_id 
    and status = 'confirmed'; -- Only count confirmed bookings? Or all? Usually confirmed/attended.

    -- Find matching milestone
    select * into v_milestone
    from public.milestones
    where training_count_required = v_count;

    -- If found, process reward
    if v_milestone.id is not null then
        -- Check if already unlocked (idempotency)
        if exists (select 1 from public.user_milestones where user_id = NEW.user_id and milestone_id = v_milestone.id) then
            return NEW;
        end if;

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
            -- Handle Credits if present
            if v_reward_config ? 'credits' then
                update public.profiles 
                set credits = coalesce(credits, 0) + (v_reward_config->>'credits')::int
                where id = NEW.user_id;
            end if;

            -- Handle Service if present
            if v_reward_config ? 'service_description' then
                insert into public.user_rewards (user_id, milestone_id, description)
                values (NEW.user_id, v_milestone.id, v_reward_config->>'service_description');
            end if;

            -- Handle Discount if present
            if v_reward_config ? 'discount_percent' then
                update public.profiles 
                set lifetime_discount = (v_reward_config->>'discount_percent')::numeric
                where id = NEW.user_id;
            end if;
        end if;
    end if;

    return NEW;
end;
$$ language plpgsql security definer;
