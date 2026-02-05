-- Add billing columns to profiles table
alter table profiles 
add column if not exists billing_name text,
add column if not exists billing_street text,
add column if not exists billing_city text,
add column if not exists billing_zip text,
add column if not exists billing_country text default 'Slovensko';

-- Update RLS if necessary (usually profiles policies allow update of own row)
