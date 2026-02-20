-- Nová tabuľka pre trackovanie použitia kupónov
CREATE TABLE public.coupon_usages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_id UUID REFERENCES public.discount_coupons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(coupon_id, user_id)
);

ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usages"
ON public.coupon_usages FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own usages"
ON public.coupon_usages FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service Role can manage usages"
ON public.coupon_usages FOR ALL TO service_role
USING (true)
WITH CHECK (true);
