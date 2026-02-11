'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';


function generateVoucherCode(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, 1, O, 0 for clarity
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

import { createVoucherCheckoutSession } from '@/app/actions/stripe';

export async function buyVoucher(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check user auth UNLESS isGuest is true
    const isGuest = formData.get('isGuest') === 'true';
    if (!user && !isGuest) {
        return { success: false, message: 'Musíte byť prihlásený.' };
    }

    const productId = formData.get('productId') as string;
    const recipientEmail = formData.get('recipientEmail') as string;
    const senderName = formData.get('senderName') as string;
    const message = formData.get('message') as string;

    // Billing Data (Optional, but usually present)
    const billingData = {
        billing_name: formData.get('billing_name') as string,
        billing_street: formData.get('billing_street') as string,
        billing_city: formData.get('billing_city') as string,
        billing_zip: formData.get('billing_zip') as string,
        billing_country: formData.get('billing_country') as string,
        customer_email: formData.get('customer_email') as string, // Crucial for guests
        full_name: formData.get('full_name') as string
    };

    // 1. Fetch Product
    const { data: product, error: productError } = await supabase
        .from('voucher_products')
        .select('*')
        .eq('id', productId)
        .single();

    if (productError || !product) {
        return { success: false, message: 'Produkt sa nenašiel.' };
    }

    // 2. Create Stripe Checkout Session
    const sessionRes = await createVoucherCheckoutSession(
        product.id,
        product.price,
        product.credit_amount,
        recipientEmail,
        senderName,
        message,
        billingData // NEW: Pass billing data
    );

    if (sessionRes?.error) {
        return { success: false, message: sessionRes.error };
    }

    if (sessionRes?.url) {
        return { success: true, url: sessionRes.url };
    }

    return { success: false, message: 'Nepodarilo sa vytvoriť platbu.' };
}

export async function createVoucherProduct(formData: FormData) {
    const supabase = await createClient();

    // Check admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthorized' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return { success: false, message: 'Unauthorized' };

    const title = formData.get('title') as string;
    const price = parseFloat(formData.get('price') as string);
    const credits = parseInt(formData.get('credits') as string);
    const category = formData.get('category') as string || 'Gift';
    const description = formData.get('description') as string;

    const { error } = await supabase.from('voucher_products').insert({
        title,
        price,
        credit_amount: parseInt(credits.toString()), // Ensure int
        category,
        description,
        is_active: true
    });

    if (error) {
        console.error('Create product error:', error);
        return { success: false, message: `Chyba DB: ${error.message} (${error.code})` };
    }

    revalidatePath('/admin/vouchers');
    revalidatePath('/shop/voucher');
    return { success: true, message: 'Produkt vytvorený.' };
}

export async function checkVoucher(code: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Basic Auth Check
    if (!user) return { success: false, message: 'Unauthorized' };

    // Check role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!['admin', 'employee'].includes(profile?.role)) {
        return { success: false, message: 'Unauthorized access' };
    }

    const { data: voucher, error: codeError } = await supabase
        .from('vouchers') // Correct table name
        .select(`
            *,
            voucher_products (
                title,
                category,
                price
            )
        `)
        .eq('code', code)
        .single();

    if (codeError || !voucher) {
        return { success: false, message: 'Voucher s týmto kódom neexistuje.' };
    }

    // Map status from DB to frontend boolean
    const isRedeemed = voucher.status === 'redeemed';

    // Return safe details
    return {
        success: true,
        data: {
            code: voucher.code,
            is_redeemed: isRedeemed,
            redeemed_at: voucher.updated_at,
            product: voucher.voucher_products,
            created_at: voucher.created_at
        }
    };
}

export async function redeemBeautyVoucher(code: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: 'Unauthorized' };

    // Check role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!['admin', 'employee'].includes(profile?.role)) {
        return { success: false, message: 'Unauthorized access' };
    }

    // 1. Check current status
    const { data: voucher, error: codeError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code)
        .single();

    if (codeError || !voucher) {
        return { success: false, message: 'Voucher neexistuje.' };
    }

    if (voucher.status === 'redeemed') {
        return { success: false, message: 'Voucher už bol použitý.' };
    }

    // 2. Mark as redeemed
    const { error: updateError } = await supabase
        .from('vouchers')
        .update({
            status: 'redeemed'
        })
        .eq('id', voucher.id);

    if (updateError) {
        return { success: false, message: 'Chyba pri aktualizácii statusu.' };
    }

    return { success: true, message: 'Voucher bol úspešne uplatnený.' };
}

export async function deleteVoucherProduct(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: 'Unauthorized' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return { success: false, message: 'Unauthorized' };

    const { error } = await supabase.from('voucher_products').delete().eq('id', id);

    if (error) {
        return { success: false, message: `Chyba pri mazaní: ${error.message}` };
    }

    revalidatePath('/admin/vouchers');
    revalidatePath('/shop/voucher');
    return { success: true, message: 'Produkt zmazaný.' };
}

export async function updateVoucherProduct(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: 'Unauthorized' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return { success: false, message: 'Unauthorized' };

    const id = formData.get('id') as string;
    const title = formData.get('title') as string;
    const price = parseFloat(formData.get('price') as string);
    const credits = parseInt(formData.get('credits') as string);
    const category = formData.get('category') as string || 'Gift';
    const description = formData.get('description') as string;
    const isActive = formData.get('is_active') === 'on';

    const { error } = await supabase.from('voucher_products').update({
        title,
        price,
        credit_amount: parseInt(credits.toString()),
        category,
        description,
        is_active: isActive
    }).eq('id', id);

    if (error) {
        return { success: false, message: `Chyba pri aktualizácii: ${error.message}` };
    }

    revalidatePath('/admin/vouchers');
    revalidatePath('/shop/voucher');
    return { success: true, message: 'Produkt aktualizovaný.' };
}

