-- Povolíme trénerom čítať tabuľku bookings, aby videli, kto je prihlásený na ich tréningy
drop policy if exists "Trainers can view bookings" on public.bookings;
create policy "Trainers can view bookings" on public.bookings
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'trainer'
    )
  );

-- Pre istotu pridáme aj to, že administrátori môžu vidieť všetky rezervácie
drop policy if exists "Admins can view all bookings" on public.bookings;
create policy "Admins can view all bookings" on public.bookings
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
