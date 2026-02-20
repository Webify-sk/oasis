const { loadEnvConfig } = require('@next/env');
loadEnvConfig('./');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Generujem testovacie kody...');

    // 1. Create a Discount Coupon
    const code1 = 'TEST-ZAK-15';
    const { error: e1 } = await supabase.from('discount_coupons').upsert({
        code: code1,
        discount_type: 'percentage',
        discount_value: 15,
        active: true,
        used: false
    }, { onConflict: 'code' });

    if (e1 && e1.code !== '23505') {
        console.error('Error creating discount coupon:', e1);
    } else {
        console.log('Zlavovy kupon:', code1, '(15% zlava)');
    }

    // 2. Ensure a Voucher Product exists
    let { data: products } = await supabase.from('voucher_products').select('id').limit(1);

    if (!products || products.length === 0) {
        const { data: newProduct, error: pErr } = await supabase.from('voucher_products').insert({
            title: 'Testovaci Produkt',
            price: 99,
            credit_amount: 10,
            category: 'Gift',
            is_active: true
        }).select('id').single();

        if (pErr) {
            console.error('Nepodarilo sa vytvorit testovaci voucher_product:', pErr);
            return;
        }
        products = [newProduct];
    }

    // 3. Create a Gift Voucher with necessary fields
    const code2 = 'TEST-POUKAZ-99';
    const { error: e2 } = await supabase.from('vouchers').upsert({
        code: code2,
        product_id: products[0].id,
        recipient_email: 'test@oasislounge.sk',
        sender_name: 'Test',
        credit_amount: 10,
        status: 'active',
    }, { onConflict: 'code' });

    if (e2 && e2.code !== '23505') {
        console.error('Error creating voucher:', e2);
    } else {
        console.log('Darcekovy poukaz:', code2, '(Platny, naviazany na testovaci produkt)');
    }
}

run();
