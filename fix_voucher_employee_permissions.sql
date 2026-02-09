-- Fix: Allow employees and admins to view all vouchers for verification
-- Previously, only admins and purchasers could see vouchers, causing "Voucher not found" for employees.

-- 1. Policy for SELECT (Viewing)
drop policy if exists "Staff can view all vouchers" on public.vouchers;
create policy "Staff can view all vouchers" on public.vouchers
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'employee')
    )
  );

-- 2. Policy for UPDATE (Redeeming)
drop policy if exists "Staff can update vouchers" on public.vouchers;
create policy "Staff can update vouchers" on public.vouchers
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'employee')
    )
  );

-- 3. Ensure they can see even inactive products if needed for historical vouchers
-- (Optional, but good practice if checking old vouchers)
drop policy if exists "Staff can view all voucher products" on public.voucher_products;
create policy "Staff can view all voucher products" on public.voucher_products
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'employee')
    )
  );
