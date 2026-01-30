-- Fix missing DELETE policy for bookings table
-- Without this, users cannot cancel (delete) their own bookings due to RLS.

create policy "Users can delete their own bookings" on public.bookings
  for delete using (auth.uid() = user_id);
