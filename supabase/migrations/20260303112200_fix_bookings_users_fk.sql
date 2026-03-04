-- Zmenenie FK pre tabuľku bookings z auth.users na public.profiles
ALTER TABLE "public"."bookings" DROP CONSTRAINT IF EXISTS "bookings_user_id_fkey";
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
