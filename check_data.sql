-- Check if any training types exist
select * from public.training_types;

-- Check if RLS is enabled on the table
select relname, relrowsecurity 
from pg_class 
where oid = 'public.training_types'::regclass;

-- Check policies
select * from pg_policies where tablename = 'training_types';
