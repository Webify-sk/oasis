-- Enable UUID extension if not already
create extension if not exists "uuid-ossp";

-- 1. Voucher Products (What users can buy)
create table if not exists public.voucher_products (
  id uuid not null default gen_random_uuid(),
  title text not null,
  description text,
  category text default 'Gift',
  credit_amount int not null,
  price numeric(10, 2) not null,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  constraint voucher_products_pkey primary key (id)
);

-- 2. Vouchers (The actual codes generated)
create table if not exists public.vouchers (
  id uuid not null default gen_random_uuid(),
  code text not null unique,
  product_id uuid references public.voucher_products(id) on delete set null,
  purchaser_id uuid references auth.users(id) on delete set null,
  recipient_email text,
  sender_name text,
  message text,
  credit_amount int not null,
  status text not null default 'active', -- 'active', 'redeemed', 'expired'
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone,
  constraint vouchers_pkey primary key (id)
);

-- 3. Redemptions (History)
create table if not exists public.voucher_redemptions (
  id uuid not null default gen_random_uuid(),
  voucher_id uuid references public.vouchers(id) on delete cascade,
  redeemed_by uuid references auth.users(id) on delete cascade,
  redeemed_at timestamp with time zone default now(),
  constraint voucher_redemptions_pkey primary key (id)
);

-- RLS Policies
alter table public.voucher_products enable row level security;
alter table public.vouchers enable row level security;
alter table public.voucher_redemptions enable row level security;

-- Policies for Voucher Products
drop policy if exists "Anyone can view active voucher products" on public.voucher_products;
create policy "Anyone can view active voucher products" on public.voucher_products
  for select using (is_active = true);

drop policy if exists "Admins can manage voucher products" on public.voucher_products;
create policy "Admins can manage voucher products" on public.voucher_products
  for all using (public.is_admin());

-- Policies for Vouchers
drop policy if exists "Admins can view all vouchers" on public.vouchers;
create policy "Admins can view all vouchers" on public.vouchers
  for select using (public.is_admin());

drop policy if exists "Purchasers can view their bought vouchers" on public.vouchers;
create policy "Purchasers can view their bought vouchers" on public.vouchers
  for select using (auth.uid() = purchaser_id);

-- Policies for Redemptions
drop policy if exists "Admins can view all redemptions" on public.vouchers;
create policy "Admins can view all redemptions" on public.vouchers
  for select using (public.is_admin());

drop policy if exists "Users can view their own redemptions" on public.voucher_redemptions;
create policy "Users can view their own redemptions" on public.voucher_redemptions
  for select using (auth.uid() = redeemed_by);


-- RPC: Redeem Voucher
create or replace function public.redeem_voucher(code_input text)
returns json
language plpgsql
security definer
as $$
declare
  v_voucher_id uuid;
  v_credit_amount int;
  v_status text;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  
  -- Find voucher
  select id, credit_amount, status
  into v_voucher_id, v_credit_amount, v_status
  from public.vouchers
  where code = code_input;

  -- Validation
  if v_voucher_id is null then
    return json_build_object('success', false, 'message', 'Nesprávny kód voucheru.');
  end if;

  if v_status <> 'active' then
    return json_build_object('success', false, 'message', 'Tento voucher už bol použitý alebo expiroval.');
  end if;

  -- Update Voucher Status
  update public.vouchers
  set status = 'redeemed'
  where id = v_voucher_id;

  -- Inspect Redemption
  insert into public.voucher_redemptions (voucher_id, redeemed_by)
  values (v_voucher_id, v_user_id);

  -- Add Credits to Profile
  update public.profiles
  set credits = coalesce(credits, 0) + v_credit_amount
  where id = v_user_id;

  return json_build_object('success', true, 'message', 'Voucher úspešne uplatnený! Kredity boli pripísané.', 'credits_added', v_credit_amount);
end;
$$;
