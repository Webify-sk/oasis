-- Restore Admin Access to Voucher Products
drop policy if exists "Admins can manage voucher products" on public.voucher_products;

create policy "Admins can manage voucher products" on public.voucher_products
    for all using (public.is_admin());
