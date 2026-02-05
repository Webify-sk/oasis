-- 1. Enable RLS on milestones (if not already)
alter table milestones enable row level security;

-- 2. Allow read access to everyone (authenticated)
create policy "Allow read access for all users"
on milestones for select
to authenticated
using (true);

-- 3. Insert default milestones if they don't exist
insert into milestones (title, description, training_count_required, reward)
select 'Začiatočník', 'Vaša cesta sa práve začína.', 1, 'Odznak začiatku'
where not exists (select 1 from milestones where training_count_required = 1);

insert into milestones (title, description, training_count_required, reward)
select 'Pravidelný Návštevník', 'Gratulujeme k vašej vytrvalosti!', 10, '1 kredit zdarma'
where not exists (select 1 from milestones where training_count_required = 10);

insert into milestones (title, description, training_count_required, reward)
select 'Oasis Master', 'Stali ste sa súčasťou rodiny.', 50, 'Master masáž'
where not exists (select 1 from milestones where training_count_required = 50);
