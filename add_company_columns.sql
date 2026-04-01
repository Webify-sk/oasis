-- Add company columns to profiles table
alter table profiles 
add column if not exists company_name text,
add column if not exists company_ico text,
add column if not exists company_dic text,
add column if not exists company_ic_dph text;

-- Add company columns to invoices table
alter table invoices 
add column if not exists company_name text,
add column if not exists company_ico text,
add column if not exists company_dic text,
add column if not exists company_ic_dph text;
