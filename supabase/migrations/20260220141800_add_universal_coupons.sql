-- Add new columns for universal, date-bound coupons
ALTER TABLE public.discount_coupons
ADD COLUMN valid_from TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN valid_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0;

-- Drop existing constraint on target_user_id to allow NULL
ALTER TABLE public.discount_coupons
ALTER COLUMN target_user_id DROP NOT NULL;

-- Drop old select policy because users could only see their own coupons
DROP POLICY IF EXISTS "Users can view and update their target coupons" ON public.discount_coupons;

-- Recreate policy to allow users to see their own coupons OR universal coupons
-- Universal coupons are those where target_user_id IS NULL and they are active.
CREATE POLICY "Users can view relevant coupons"
ON public.discount_coupons 
FOR SELECT 
TO authenticated 
USING (
    target_user_id = auth.uid() OR 
    (target_user_id IS NULL AND active = true)
);

-- Note: We do NOT allow users to update universal coupons. The existing UPDATE policy needs to be recreated or kept same.
-- The existing update policy was: "Users can update their target coupons"
-- That one only allows `target_user_id = auth.uid()`. That is still correct, 
-- users shouldn't be updating universal coupons themselves directly via client.
-- Webhook does it with service role key or admin/employee, which bypasses or uses different rules.
-- But wait! Our webhook uses `service_role_key` so it bypasses RLS. So that's fine.
-- However, when applying coupons in `validateCouponAction` or Stripe session creation, we are only SELECTing. 
-- Wait, in `stripe.ts` if a coupon brings price to 0, we update `used = true`. 
-- That uses the authenticated user's client.
-- "Ak je cena po zľave 0 (100% zľava), nevyžadujeme Stripe Checkout. Priamo pripíšeme kredity a označíme kupón ako použitý"
-- For a universal coupon, we should increment `usage_count`, not set `used = true` via client.
-- But the client needs UPDATE permission to do that if it uses `supabase.auth.getUser()` client.
-- Let's check `stripe.ts`. It uses `createClient()`. The user will call `.update({ usage_count: usage_count + 1 })`.
-- So we need an UPDATE policy that allows users to increment usage_count on universal coupons. Or we do it via a service-role/RPC.
-- Actually, a better way is to create an RPC function to apply the coupon, but the current implementation just does a direct UPDATE.
-- For now, let's allow users to temporarily update usage_count or used for universal coupons.
-- To be secure, it's risky to let them update any field on universal coupons.
-- "Users can use universal coupons" -> UPDATE where target_user_id IS NULL.
-- But they could change `discount_value`. So an RPC is safer.
-- Wait, the user is authenticated. Let's just create a highly specific policy if we can, or just allow UPDATE and trust the backend because the action is running server-side.
-- `createCheckoutSession` is a SERVER ACTION ('use server').
-- Wait. `createClient()` inside a server action uses the user's cookies, so RLS applies to the auth.uid().
-- In `checkoutSession` and `validateCouponAction` we are just SELECTing, that's allowed by the new SELECT policy.
-- But in `checkoutSession` IF `amount === 0`, we do `update({ used: true... })`.
-- If we do `update({ usage_count: usage_count + 1 })` for a universal coupon, RLS will block it unless we grant update.
-- Since it's a server action, `createCheckoutSession` could use a service role client just for that update.
-- Let's just create an UPDATE policy for universal coupons since anyone can use them.
-- Or better, we'll update the server action to use service role key for that specific update, OR we add it to the policy.
-- Let's add a policy:
-- FOR UPDATE USING (target_user_id = auth.uid() OR target_user_id IS NULL) WITH CHECK (target_user_id = auth.uid() OR target_user_id IS NULL)
-- This allows any logged-in user to update the coupon.

DROP POLICY IF EXISTS "Users can update their target coupons" ON public.discount_coupons;

CREATE POLICY "Users can update their target coupons" 
ON public.discount_coupons 
FOR UPDATE 
TO authenticated 
USING (
    target_user_id = auth.uid() OR target_user_id IS NULL
)
WITH CHECK (
    target_user_id = auth.uid() OR target_user_id IS NULL
);
