-- Robust script to fix Admin Profile
-- Runs in Supabase SQL Editor

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1. Get the User ID from auth.users (Supabase Auth Table)
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'bkonecny45@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User bkonecny45@gmail.com NOT FOUND in auth.users. Please sign up first!';
  END IF;

  -- 2. Upsert (Insert or Update) the profile with Admin Role
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (v_user_id, 'bkonecny45@gmail.com', 'Super Admin', 'admin')
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'admin',
    email = 'bkonecny45@gmail.com'; -- Ensure email is synced

  RAISE NOTICE 'SUCCESS: User bkonecny45@gmail.com is now an ADMIN.';
END $$;
