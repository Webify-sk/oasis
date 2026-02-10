-- 1. Enable RLS (if not already)
alter table public.voucher_products enable row level security;

-- 2. Allow Public Read Access
-- Use 'is_active' filter so we don't show internal/deprecated ones
drop policy if exists "Anyone can view active voucher products" on public.voucher_products;
create policy "Anyone can view active voucher products" on public.voucher_products
    for select using (is_active = true);
