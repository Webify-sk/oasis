-- Povolíme trénerom čítať tabuľku profiles len pre klientov, ktorí sú prihlásení na ich tréningy
-- Pre jednoduchosť: zatiaľ povolíme trénerom čítať základné info z profiles (meno, telefón, email)
drop policy if exists "Trainers can view profiles" on public.profiles;
create policy "Trainers can view profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'trainer'
    )
  );
