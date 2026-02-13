alter table public.bookings 
add column if not exists reminder_sent boolean default false;
