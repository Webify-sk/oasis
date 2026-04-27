-- 1. Vytvorenie tabuľky pre Dávky Kreditov (Credit Batches)
CREATE TABLE IF NOT EXISTS public.credit_batches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount numeric NOT NULL,
    remaining_amount numeric NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Nastavenie RLS pre credit_batches
ALTER TABLE public.credit_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for users based on user_id" ON public.credit_batches
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable all for admins and service roles" ON public.credit_batches
    USING (true)
    WITH CHECK (true);

-- 2. Vytvorenie tabuľky pre Záznamy odpočtov (Booking Deductions)
CREATE TABLE IF NOT EXISTS public.booking_deductions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    batch_id uuid REFERENCES public.credit_batches(id) ON DELETE CASCADE NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Nastavenie RLS pre booking_deductions
ALTER TABLE public.booking_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for admins and service roles" ON public.booking_deductions
    USING (true)
    WITH CHECK (true);

-- 3. Prenesenie súčasných kreditov do nultej "startovacej" dávky
INSERT INTO public.credit_batches (user_id, amount, remaining_amount, expires_at, created_at)
SELECT id, credits, credits, credits_expire_at, COALESCE(updated_at, now())
FROM public.profiles
WHERE credits > 0;
