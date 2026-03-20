'use server';

import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/utils/email';
import { getEmailTemplate } from '@/utils/email-template';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

interface GenerateCouponsParams {
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    targetUserIds: string[];
    emailSubject: string;
    emailText: string;
}

// Helper to generate a unique code like ZLAVA20-A1B2
function generateUniqueCode(prefix: string): string {
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase(); // 4 chars
    return `${prefix}-${randomHex}`;
}

export async function generateCouponsAction({ discountType, discountValue, targetUserIds, emailSubject, emailText }: GenerateCouponsParams) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: 'Nie ste prihlásený.' };
        }

        // Verify admin/employee role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || (profile.role !== 'admin' && profile.role !== 'employee')) {
            return { error: 'Nemáte oprávnenie na túto akciu.' };
        }

        if (targetUserIds.length === 0) {
            return { error: 'Vyberte aspoň jedného používateľa.' };
        }

        // Fetch user emails and names
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', targetUserIds);

        if (usersError || !users) {
            return { error: 'Nepodarilo sa načítať používateľov.' };
        }

        const prefix = discountType === 'percentage'
            ? `ZLAVA${discountValue}`
            : `KUPON${discountValue}`;

        // Generate coupons data
        const couponsData = users.map(u => ({
            code: generateUniqueCode(prefix),
            discount_type: discountType,
            discount_value: discountValue,
            target_user_id: u.id,
            created_by: user.id,
            active: true,
            used: false
        }));

        // Insert into DB
        const { error: insertError } = await supabase
            .from('discount_coupons')
            .insert(couponsData);

        if (insertError) {
            console.error('Error inserting coupons:', insertError);
            return { error: `Nepodarilo sa vytvoriť kupóny v databáze: ${insertError.message} ${insertError.details || ''} ${insertError.hint || ''}` };
        }

        // Send Emails asynchronously (don't block the UI too long, but wait for them if it's small)
        // For large lists, you would use a background job/queue. 
        // We'll process them in batches or `Promise.all` for simplicity here.
        const emailPromises = users.map(u => {
            const userCoupon = couponsData.find(c => c.target_user_id === u.id);
            if (!userCoupon || !u.email) return Promise.resolve();

            const discountText = discountType === 'percentage'
                ? `${discountValue}%`
                : `${discountValue} €`;

            const formattedText = emailText.split('\n').map(line => {
                const trimmed = line.trim();
                return trimmed ? `<p>${trimmed}</p>` : '<br/>';
            }).join('\n');

            const emailHtml = getEmailTemplate(
                emailSubject,
                `
                    ${formattedText}
                    
                    <div style="background-color: #f9f9f9; border-left: 4px solid #93745F; padding: 20px; margin: 30px 0; text-align: center;">
                        <span style="font-size: 14px; color: #6b7280; text-transform: uppercase;">Tvoj unikátny kód</span><br/>
                        <span style="font-size: 28px; font-weight: bold; font-family: monospace; color: #111827; letter-spacing: 2px;">${userCoupon.code}</span>
                    </div>

                    <p style="margin-top: 30px;">
                        <a href="https://www.oasislounge.sk/" class="button" style="display: inline-block; background-color: #93745F; color: white !important; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                            Rezervovať termín
                        </a>
                    </p>
                `
            );

            return sendEmail({
                to: u.email,
                subject: emailSubject,
                html: emailHtml
            });
        });

        await Promise.allSettled(emailPromises);

        revalidatePath('/admin/coupons');
        return { success: true };

    } catch (error: any) {
        console.error('Error generating coupons:', error);
        return { error: 'Nastala chyba pri generovaní kupónov.' };
    }
}

export async function toggleCouponStatusAction(couponId: string, isActive: boolean) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: 'Nie ste prihlásený.' };
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || (profile.role !== 'admin' && profile.role !== 'employee')) {
            return { error: 'Nemáte oprávnenie na túto akciu.' };
        }

        const { error: updateError } = await supabase
            .from('discount_coupons')
            .update({ active: isActive })
            .eq('id', couponId);

        if (updateError) {
            console.error('Error updating coupon status:', updateError);
            return { error: 'Nepodarilo sa zmeniť stav kupónu.' };
        }

        revalidatePath('/admin/coupons');
        return { success: true };
    } catch (error) {
        console.error('Error updating coupon status:', error);
        return { error: 'Nastala chyba pri zmene stavu kupónu.' };
    }
}

interface CreateUniversalCouponParams {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    validFrom: string;
    validUntil: string;
}

export async function createUniversalCouponAction({ code, discountType, discountValue, validFrom, validUntil }: CreateUniversalCouponParams) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: 'Nie ste prihlásený.' };
        }

        // Verify admin/employee role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || (profile.role !== 'admin' && profile.role !== 'employee')) {
            return { error: 'Nemáte oprávnenie na túto akciu.' };
        }

        if (!code || code.trim() === '') {
            return { error: 'Zadajte kód kupónu.' };
        }

        const cleanCode = code.trim().toUpperCase();

        const couponData = {
            code: cleanCode,
            discount_type: discountType,
            discount_value: discountValue,
            target_user_id: null,
            created_by: user.id,
            valid_from: new Date(validFrom).toISOString(),
            valid_until: new Date(validUntil).toISOString(),
            active: true,
            used: false
        };

        const { error: insertError } = await supabase
            .from('discount_coupons')
            .insert([couponData]);

        if (insertError) {
            console.error('Error inserting universal coupon:', insertError);
            if (insertError.code === '23505') { // unique violation
                return { error: 'Kupón s týmto kódom už existuje.' };
            }
            return { error: `Nepodarilo sa vytvoriť univerzálny kupón: ${insertError.message}` };
        }

        revalidatePath('/admin/coupons');
        return { success: true };

    } catch (error: any) {
        console.error('Error generating universal coupon:', error);
        return { error: 'Nastala chyba pri generovaní kupónu.' };
    }
}
