'use server';

import { createClient } from '@/utils/supabase/server';

export async function validateCouponAction(code: string, packagePrice: number) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: 'Pre uplatnenie kupónu musíte byť prihlásený.' };
        }

        // Clean code string
        const cleanCode = code.trim().toUpperCase();

        if (!cleanCode) {
            return { error: 'Zadajte kód kupónu.' };
        }

        // Check if coupon exists and is valid
        const { data: coupon, error } = await supabase
            .from('discount_coupons')
            .select('*')
            .eq('code', cleanCode)
            .single();

        if (error || !coupon) {
            return { error: 'Tento kupón neexistuje alebo je neplatný.' };
        }

        if (!coupon.active) {
            return { error: 'Tento kupón bol deaktivovaný administrátorom.' };
        }

        if (coupon.used) {
            return { error: 'Tento kupón už bol uplatnený.' };
        }

        if (coupon.target_user_id !== user.id) {
            return { error: 'Tento kupón nie je určený pre Váš účet.' };
        }

        // Calculate new price
        let discountAmount = 0;
        if (coupon.discount_type === 'percentage') {
            discountAmount = packagePrice * (coupon.discount_value / 100);
        } else if (coupon.discount_type === 'fixed') {
            discountAmount = coupon.discount_value;
        }

        let newPrice = packagePrice - discountAmount;
        if (newPrice < 0) newPrice = 0; // Prevent negative prices

        return {
            success: true,
            discountType: coupon.discount_type,
            discountValue: coupon.discount_value,
            originalPrice: packagePrice,
            newPrice: Number(newPrice.toFixed(2)),
            couponId: coupon.id,
            couponCode: coupon.code
        };

    } catch (error: any) {
        console.error('Coupon validation error:', error);
        return { error: 'Nastala chyba pri overovaní kupónu.' };
    }
}
