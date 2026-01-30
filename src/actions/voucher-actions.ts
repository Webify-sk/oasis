'use server';

import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';


const resend = new Resend(process.env.RESEND_API_KEY);

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

    if (!user) {
        return { success: false, message: 'Musíte byť prihlásený.' };
    }

    const productId = formData.get('productId') as string;
    const recipientEmail = formData.get('recipientEmail') as string;
    const senderName = formData.get('senderName') as string;
    const message = formData.get('message') as string;

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
        message
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

    return { success: true, message: 'Produkt vytvorený.' };
}
