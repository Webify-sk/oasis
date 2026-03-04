


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_milestone_unlock"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
    v_count int;
    v_milestone record;
    v_reward_config jsonb;
begin
    -- Count confirmed bookings for this user
    select count(*) into v_count
    from public.bookings
    where user_id = NEW.user_id
    and status = 'confirmed';

    -- Find matching milestone
    select * into v_milestone
    from public.milestones
    where training_count_required = v_count;

    -- If match found, and not already unlocked
    if v_milestone.id is not null then
        if not exists (select 1 from public.user_milestones where user_id = NEW.user_id and milestone_id = v_milestone.id) then
            
            -- Log unlock
            insert into public.user_milestones (user_id, milestone_id)
            values (NEW.user_id, v_milestone.id);

            v_reward_config := v_milestone.reward_config;

            -- Process Reward Type
            if v_milestone.reward_type = 'credits' then
                update public.profiles 
                set credits = coalesce(credits, 0) + (v_reward_config->>'credits')::int
                where id = NEW.user_id;

            elsif v_milestone.reward_type = 'service' then
                insert into public.user_rewards (user_id, milestone_id, description)
                values (NEW.user_id, v_milestone.id, v_reward_config->>'description');

            elsif v_milestone.reward_type = 'discount' then
                 update public.profiles 
                 set lifetime_discount = (v_reward_config->>'discount_percent')::numeric
                 where id = NEW.user_id;

            elsif v_milestone.reward_type = 'bundle' then
                if v_reward_config ? 'credits' then
                    update public.profiles 
                    set credits = coalesce(credits, 0) + (v_reward_config->>'credits')::int
                    where id = NEW.user_id;
                end if;
                if v_reward_config ? 'service_description' then
                    insert into public.user_rewards (user_id, milestone_id, description)
                    values (NEW.user_id, v_milestone.id, v_reward_config->>'service_description');
                end if;
                if v_reward_config ? 'discount_percent' then
                    update public.profiles 
                    set lifetime_discount = (v_reward_config->>'discount_percent')::numeric
                    where id = NEW.user_id;
                end if;
            end if;

        end if;
    end if;

    return NEW;
end;
$$;


ALTER FUNCTION "public"."check_milestone_unlock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, date_of_birth)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    (new.raw_user_meta_data->>'date_of_birth')::date
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_employee_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
    -- If this profile has role 'employee', ensure an employee record exists or is linked
    -- (Actually, for manual flow, we just rely on the 'employees.profile_id' Foreign Key)
    
    -- Sync email updates: if profile email changes, update employee email if linked
    if old.email is distinct from new.email then
        update public.employees set email = new.email where profile_id = new.id;
    end if;

    return new;
end;
$$;


ALTER FUNCTION "public"."link_employee_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_voucher"("code_input" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_voucher_id uuid;
  v_credit_amount int;
  v_status text;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  
  -- Find voucher
  select id, credit_amount, status
  into v_voucher_id, v_credit_amount, v_status
  from public.vouchers
  where code = code_input;

  -- Validation
  if v_voucher_id is null then
    return json_build_object('success', false, 'message', 'Nesprávny kód voucheru.');
  end if;

  if v_status <> 'active' then
    return json_build_object('success', false, 'message', 'Tento voucher už bol použitý alebo expiroval.');
  end if;

  -- Update Voucher Status
  update public.vouchers
  set status = 'redeemed'
  where id = v_voucher_id;

  -- Inspect Redemption
  insert into public.voucher_redemptions (voucher_id, redeemed_by)
  values (v_voucher_id, v_user_id);

  -- Add Credits to Profile
  update public.profiles
  set credits = coalesce(credits, 0) + v_credit_amount
  where id = v_user_id;

  return json_build_object('success', true, 'message', 'Voucher úspešne uplatnený! Kredity boli pripísané.', 'credits_added', v_credit_amount);
end;
$$;


ALTER FUNCTION "public"."redeem_voucher"("code_input" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "training_type_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'confirmed'::"text" NOT NULL,
    "reminder_sent" boolean DEFAULT false,
    "participants_count" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cosmetic_appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "employee_id" "uuid",
    "service_id" "uuid",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "client_name" "text",
    "client_email" "text",
    "client_phone" "text",
    CONSTRAINT "cosmetic_appointments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."cosmetic_appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cosmetic_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "duration_minutes" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "owner_id" "uuid",
    "category" "text" DEFAULT 'beauty'::"text"
);


ALTER TABLE "public"."cosmetic_services" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cosmetic_services"."category" IS 'Category of the service (e.g., beauty, body)';



CREATE TABLE IF NOT EXISTS "public"."coupon_usages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coupon_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."coupon_usages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "price" numeric NOT NULL,
    "credits" integer NOT NULL,
    "bonus_credits" integer DEFAULT 0,
    "description" "text",
    "validity_months" integer,
    "is_active" boolean DEFAULT true,
    "is_popular" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."credit_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discount_coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "discount_value" numeric NOT NULL,
    "target_user_id" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "used" boolean DEFAULT false NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid",
    "valid_from" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "valid_until" timestamp with time zone,
    "usage_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "discount_coupons_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "discount_coupons_discount_value_check" CHECK (("discount_value" > (0)::numeric))
);


ALTER TABLE "public"."discount_coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "day_of_week" integer,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "is_recurring" boolean DEFAULT true,
    "specific_date" "date",
    "is_available" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "employee_availability_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."employee_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_availability_exceptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "employee_id" "uuid",
    "exception_date" "date" NOT NULL,
    "is_available" boolean DEFAULT false,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employee_availability_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_services" (
    "employee_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL
);


ALTER TABLE "public"."employee_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid",
    "name" "text" NOT NULL,
    "bio" "text",
    "color" "text" DEFAULT '#5E715D'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "email" "text",
    "role_type" "text" DEFAULT 'employee'::"text"
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "invoice_number" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text",
    "hours_purchased" integer,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "stripe_payment_id" "text",
    "status" "text" DEFAULT 'paid'::"text",
    "billing_name" "text",
    "billing_address" "text",
    "billing_city" "text",
    "billing_zip" "text",
    "billing_country" "text" DEFAULT 'Slovensko'::"text",
    "customer_email" "text"
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."milestones" (
    "id" integer NOT NULL,
    "training_count_required" integer NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "description" "text",
    "reward_credits" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reward_type" "text",
    "reward_config" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "milestones_reward_type_check" CHECK (("reward_type" = ANY (ARRAY['credits'::"text", 'service'::"text", 'discount'::"text", 'bundle'::"text"])))
);


ALTER TABLE "public"."milestones" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."milestones_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."milestones_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."milestones_id_seq" OWNED BY "public"."milestones"."id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "phone" "text",
    "role" "text" DEFAULT 'user'::"text",
    "credits" integer DEFAULT 0,
    "date_of_birth" "date",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "billing_name" "text",
    "billing_street" "text",
    "billing_city" "text",
    "billing_zip" "text",
    "billing_country" "text" DEFAULT 'Slovensko'::"text",
    "email_verified" boolean DEFAULT false,
    "verification_token" "text",
    "lifetime_discount" numeric(5,2) DEFAULT 0,
    "unlimited_expires_at" timestamp with time zone,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'employee'::"text", 'trainer'::"text", 'user'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trainers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "specialties" "text"[] DEFAULT '{}'::"text"[],
    "bio" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "profile_id" "uuid",
    "email" "text",
    "phone" "text"
);


ALTER TABLE "public"."trainers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."training_session_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "training_type_id" "uuid" NOT NULL,
    "session_start_time" timestamp with time zone NOT NULL,
    "is_individual" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."training_session_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."training_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "perex" "text",
    "muscle_group" "text",
    "level" "text",
    "capacity" integer DEFAULT 8,
    "duration_minutes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "schedule" "jsonb" DEFAULT '[]'::"jsonb",
    "price_credits" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "training_types_level_check" CHECK (("level" = ANY (ARRAY['Začiatočník'::"text", 'Pokročilý'::"text", 'Všetky úrovne'::"text"])))
);


ALTER TABLE "public"."training_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trainings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "description" "text",
    "trainer_id" "uuid",
    "training_type_id" "uuid",
    "level" "text",
    "capacity" integer DEFAULT 8,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."trainings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_milestones" (
    "user_id" "uuid" NOT NULL,
    "milestone_id" integer NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_milestones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "milestone_id" integer,
    "description" "text" NOT NULL,
    "is_redeemed" boolean DEFAULT false,
    "redeemed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vacations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vacations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voucher_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'Gift'::"text",
    "credit_amount" integer NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."voucher_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voucher_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "voucher_id" "uuid",
    "redeemed_by" "uuid",
    "redeemed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."voucher_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vouchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "product_id" "uuid",
    "purchaser_id" "uuid",
    "recipient_email" "text",
    "sender_name" "text",
    "message" "text",
    "credit_amount" integer NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."milestones" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."milestones_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cosmetic_appointments"
    ADD CONSTRAINT "cosmetic_appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cosmetic_services"
    ADD CONSTRAINT "cosmetic_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_usages"
    ADD CONSTRAINT "coupon_usages_coupon_id_user_id_key" UNIQUE ("coupon_id", "user_id");



ALTER TABLE ONLY "public"."coupon_usages"
    ADD CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_packages"
    ADD CONSTRAINT "credit_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discount_coupons"
    ADD CONSTRAINT "discount_coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."discount_coupons"
    ADD CONSTRAINT "discount_coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_availability_exceptions"
    ADD CONSTRAINT "employee_availability_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_services"
    ADD CONSTRAINT "employee_services_pkey" PRIMARY KEY ("employee_id", "service_id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_training_count_required_key" UNIQUE ("training_count_required");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_user_id_training_id_key" UNIQUE ("user_id", "training_id");



ALTER TABLE ONLY "public"."trainers"
    ADD CONSTRAINT "trainers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_session_exceptions"
    ADD CONSTRAINT "training_session_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_session_exceptions"
    ADD CONSTRAINT "training_session_exceptions_training_type_id_session_start__key" UNIQUE ("training_type_id", "session_start_time");



ALTER TABLE ONLY "public"."training_types"
    ADD CONSTRAINT "training_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_milestones"
    ADD CONSTRAINT "user_milestones_pkey" PRIMARY KEY ("user_id", "milestone_id");



ALTER TABLE ONLY "public"."user_rewards"
    ADD CONSTRAINT "user_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vacations"
    ADD CONSTRAINT "vacations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voucher_products"
    ADD CONSTRAINT "voucher_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voucher_redemptions"
    ADD CONSTRAINT "voucher_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "on_booking_milestone_check" AFTER INSERT ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."check_milestone_unlock"();



CREATE OR REPLACE TRIGGER "on_profile_link_employee" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."link_employee_profile"();



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_training_type_id_fkey" FOREIGN KEY ("training_type_id") REFERENCES "public"."training_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cosmetic_appointments"
    ADD CONSTRAINT "cosmetic_appointments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cosmetic_appointments"
    ADD CONSTRAINT "cosmetic_appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."cosmetic_services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cosmetic_appointments"
    ADD CONSTRAINT "cosmetic_appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cosmetic_services"
    ADD CONSTRAINT "cosmetic_services_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coupon_usages"
    ADD CONSTRAINT "coupon_usages_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."discount_coupons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_usages"
    ADD CONSTRAINT "coupon_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discount_coupons"
    ADD CONSTRAINT "discount_coupons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."discount_coupons"
    ADD CONSTRAINT "discount_coupons_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_availability_exceptions"
    ADD CONSTRAINT "employee_availability_exceptions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_services"
    ADD CONSTRAINT "employee_services_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_services"
    ADD CONSTRAINT "employee_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."cosmetic_services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trainers"
    ADD CONSTRAINT "trainers_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."training_session_exceptions"
    ADD CONSTRAINT "training_session_exceptions_training_type_id_fkey" FOREIGN KEY ("training_type_id") REFERENCES "public"."training_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_training_type_id_fkey" FOREIGN KEY ("training_type_id") REFERENCES "public"."training_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_milestones"
    ADD CONSTRAINT "user_milestones_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_milestones"
    ADD CONSTRAINT "user_milestones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_rewards"
    ADD CONSTRAINT "user_rewards_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_rewards"
    ADD CONSTRAINT "user_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voucher_redemptions"
    ADD CONSTRAINT "voucher_redemptions_redeemed_by_fkey" FOREIGN KEY ("redeemed_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voucher_redemptions"
    ADD CONSTRAINT "voucher_redemptions_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."voucher_products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_purchaser_id_fkey" FOREIGN KEY ("purchaser_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Admin full access" ON "public"."credit_packages" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can do everything on services" ON "public"."cosmetic_services" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage credit packages" ON "public"."credit_packages" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage trainers." ON "public"."trainers" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage training types." ON "public"."training_types" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage trainings." ON "public"."trainings" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage voucher products" ON "public"."voucher_products" USING ("public"."is_admin"());



CREATE POLICY "Admins can update all profiles." ON "public"."profiles" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins can view all bookings" ON "public"."bookings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all invoices." ON "public"."invoices" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all redemptions" ON "public"."vouchers" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all registrations." ON "public"."registrations" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all vouchers" ON "public"."vouchers" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Anyone can view active voucher products" ON "public"."voucher_products" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Authenticated can view profiles" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete availability" ON "public"."employee_availability" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete employee_services" ON "public"."employee_services" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete employees" ON "public"."employees" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete exceptions" ON "public"."employee_availability_exceptions" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete services" ON "public"."cosmetic_services" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert availability" ON "public"."employee_availability" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert employee_services" ON "public"."employee_services" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert employees" ON "public"."employees" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert exceptions" ON "public"."employee_availability_exceptions" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert services" ON "public"."cosmetic_services" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update any appointment" ON "public"."cosmetic_appointments" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update availability" ON "public"."employee_availability" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update employees" ON "public"."employees" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update exceptions" ON "public"."employee_availability_exceptions" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update services" ON "public"."cosmetic_services" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view bookings (for occupancy)" ON "public"."bookings" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Availability is viewable by everyone" ON "public"."employee_availability" FOR SELECT USING (true);



CREATE POLICY "Credit packages are viewable by everyone" ON "public"."credit_packages" FOR SELECT USING (true);



CREATE POLICY "Employee services are viewable by everyone" ON "public"."employee_services" FOR SELECT USING (true);



CREATE POLICY "Employees and Admins can manage all appointments" ON "public"."cosmetic_appointments" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['employee'::"text", 'admin'::"text"]))))));



CREATE POLICY "Employees are viewable by everyone" ON "public"."employees" FOR SELECT USING (true);



CREATE POLICY "Employees can delete own services" ON "public"."cosmetic_services" FOR DELETE USING (("owner_id" IN ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."profile_id" = "auth"."uid"()))));



CREATE POLICY "Employees can insert services" ON "public"."cosmetic_services" FOR INSERT WITH CHECK (("owner_id" IN ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."profile_id" = "auth"."uid"()))));



CREATE POLICY "Employees can manage discount_coupons" ON "public"."discount_coupons" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'employee'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'employee'::"text"]))))));



CREATE POLICY "Employees can manage own availability" ON "public"."employee_availability" USING (("employee_id" IN ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."profile_id" = "auth"."uid"()))));



CREATE POLICY "Employees can update own services" ON "public"."cosmetic_services" FOR UPDATE USING (("owner_id" IN ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."profile_id" = "auth"."uid"()))));



CREATE POLICY "Employees can view own assigned appointments" ON "public"."cosmetic_appointments" FOR SELECT USING (("employee_id" IN ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."profile_id" = "auth"."uid"()))));



CREATE POLICY "Enable delete for authenticated users only" ON "public"."training_session_exceptions" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable delete for authenticated users only" ON "public"."vacations" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."training_session_exceptions" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."vacations" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."training_session_exceptions" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."vacations" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."training_session_exceptions" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable update for authenticated users only" ON "public"."vacations" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Exceptions are viewable by everyone" ON "public"."employee_availability_exceptions" FOR SELECT USING (true);



CREATE POLICY "Milestones are viewable by everyone" ON "public"."milestones" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."credit_packages" FOR SELECT USING (true);



CREATE POLICY "Public/Client can view exceptions (for booking)" ON "public"."employee_availability_exceptions" FOR SELECT USING (true);



CREATE POLICY "Purchasers can view their bought vouchers" ON "public"."vouchers" FOR SELECT USING (("auth"."uid"() = "purchaser_id"));



CREATE POLICY "Service Role can manage usages" ON "public"."coupon_usages" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can insert invoices" ON "public"."invoices" FOR INSERT WITH CHECK (true);



CREATE POLICY "Services are viewable by everyone (public)" ON "public"."cosmetic_services" FOR SELECT USING (true);



CREATE POLICY "Staff can update vouchers" ON "public"."vouchers" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'employee'::"text"]))))));



CREATE POLICY "Staff can view all voucher products" ON "public"."voucher_products" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'employee'::"text"]))))));



CREATE POLICY "Staff can view all vouchers" ON "public"."vouchers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'employee'::"text"]))))));



CREATE POLICY "Trainers are viewable by everyone." ON "public"."trainers" FOR SELECT USING (true);



CREATE POLICY "Trainers can view bookings" ON "public"."bookings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'trainer'::"text")))));



CREATE POLICY "Training Types are viewable by everyone." ON "public"."training_types" FOR SELECT USING (true);



CREATE POLICY "Trainings are viewable by everyone." ON "public"."trainings" FOR SELECT USING (true);



CREATE POLICY "Users can delete their own bookings" ON "public"."bookings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own registration." ON "public"."registrations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own appointments" ON "public"."cosmetic_appointments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own bookings" ON "public"."bookings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own registration." ON "public"."registrations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own usages" ON "public"."coupon_usages" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own bookings" ON "public"."bookings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their target coupons" ON "public"."discount_coupons" FOR UPDATE TO "authenticated" USING ((("target_user_id" = "auth"."uid"()) OR ("target_user_id" IS NULL))) WITH CHECK ((("target_user_id" = "auth"."uid"()) OR ("target_user_id" IS NULL)));



CREATE POLICY "Users can view own appointments" ON "public"."cosmetic_appointments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view relevant coupons" ON "public"."discount_coupons" FOR SELECT TO "authenticated" USING ((("target_user_id" = "auth"."uid"()) OR (("target_user_id" IS NULL) AND ("active" = true))));



CREATE POLICY "Users can view their own bookings" ON "public"."bookings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own invoices" ON "public"."invoices" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own invoices." ON "public"."invoices" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own milestones" ON "public"."user_milestones" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own redemptions" ON "public"."voucher_redemptions" FOR SELECT USING (("auth"."uid"() = "redeemed_by"));



CREATE POLICY "Users can view their own registrations." ON "public"."registrations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own rewards" ON "public"."user_rewards" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own usages" ON "public"."coupon_usages" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cosmetic_appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cosmetic_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupon_usages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_packages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discount_coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_availability_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."milestones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trainers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."training_session_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."training_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trainings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_milestones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vacations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voucher_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voucher_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vouchers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_milestone_unlock"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_milestone_unlock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_milestone_unlock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."link_employee_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."link_employee_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_employee_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."redeem_voucher"("code_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_voucher"("code_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_voucher"("code_input" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."cosmetic_appointments" TO "anon";
GRANT ALL ON TABLE "public"."cosmetic_appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."cosmetic_appointments" TO "service_role";



GRANT ALL ON TABLE "public"."cosmetic_services" TO "anon";
GRANT ALL ON TABLE "public"."cosmetic_services" TO "authenticated";
GRANT ALL ON TABLE "public"."cosmetic_services" TO "service_role";



GRANT ALL ON TABLE "public"."coupon_usages" TO "anon";
GRANT ALL ON TABLE "public"."coupon_usages" TO "authenticated";
GRANT ALL ON TABLE "public"."coupon_usages" TO "service_role";



GRANT ALL ON TABLE "public"."credit_packages" TO "anon";
GRANT ALL ON TABLE "public"."credit_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_packages" TO "service_role";



GRANT ALL ON TABLE "public"."discount_coupons" TO "anon";
GRANT ALL ON TABLE "public"."discount_coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."discount_coupons" TO "service_role";



GRANT ALL ON TABLE "public"."employee_availability" TO "anon";
GRANT ALL ON TABLE "public"."employee_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_availability" TO "service_role";



GRANT ALL ON TABLE "public"."employee_availability_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."employee_availability_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_availability_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."employee_services" TO "anon";
GRANT ALL ON TABLE "public"."employee_services" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_services" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."milestones" TO "anon";
GRANT ALL ON TABLE "public"."milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."milestones" TO "service_role";



GRANT ALL ON SEQUENCE "public"."milestones_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."milestones_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."milestones_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."registrations" TO "anon";
GRANT ALL ON TABLE "public"."registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."registrations" TO "service_role";



GRANT ALL ON TABLE "public"."trainers" TO "anon";
GRANT ALL ON TABLE "public"."trainers" TO "authenticated";
GRANT ALL ON TABLE "public"."trainers" TO "service_role";



GRANT ALL ON TABLE "public"."training_session_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."training_session_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."training_session_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."training_types" TO "anon";
GRANT ALL ON TABLE "public"."training_types" TO "authenticated";
GRANT ALL ON TABLE "public"."training_types" TO "service_role";



GRANT ALL ON TABLE "public"."trainings" TO "anon";
GRANT ALL ON TABLE "public"."trainings" TO "authenticated";
GRANT ALL ON TABLE "public"."trainings" TO "service_role";



GRANT ALL ON TABLE "public"."user_milestones" TO "anon";
GRANT ALL ON TABLE "public"."user_milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."user_milestones" TO "service_role";



GRANT ALL ON TABLE "public"."user_rewards" TO "anon";
GRANT ALL ON TABLE "public"."user_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."user_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."vacations" TO "anon";
GRANT ALL ON TABLE "public"."vacations" TO "authenticated";
GRANT ALL ON TABLE "public"."vacations" TO "service_role";



GRANT ALL ON TABLE "public"."voucher_products" TO "anon";
GRANT ALL ON TABLE "public"."voucher_products" TO "authenticated";
GRANT ALL ON TABLE "public"."voucher_products" TO "service_role";



GRANT ALL ON TABLE "public"."voucher_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."voucher_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."voucher_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."vouchers" TO "anon";
GRANT ALL ON TABLE "public"."vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."vouchers" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Anyone can upload an avatar."
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'avatars'::text));



  create policy "Avatar images are publicly accessible."
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



