-- Fix: Allow authenticated users to insert into vouchers (Buy action)
-- Only allow inserting if they are the purchaser
create policy "Users can purchase vouchers" on public.vouchers
  for insert with check (auth.uid() = purchaser_id);
