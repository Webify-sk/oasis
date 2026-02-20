import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server' // Note: This uses cookies which might behave differently in webhook. 
// Ideally we need a supabase admin client for webhooks (service role key), but for now we try with standard client if RLS allows or if we use service role.
// Actually, webhooks need SERVICE_ROLE_KEY to bypass RLS and update ANY user's profile.
// Since we don't have SERVICE_ROLE_KEY in .env.local yet (usually), we might face issues if we try to auth as the user (who is not logged in during webhook call).
// CHECK: user provided .env.local content earlier. NEXT_PUBLIC_SUPABASE_ANON_KEY is there. But no SERVICE_ROLE_KEY.
// We must assume for now we might need to add SERVICE_ROLE_KEY if we want to write to profiles without user session.
// However, the user is not technically logged in effectively in the webhook request context.
// Let's first try to structure the webhook, and I'll notify user about SUPABASE_SERVICE_ROLE_KEY if needed.
// WAIT - I can use the ANON key but I won't have a user session. 
// "createClient" in 'utils/supabase/server' uses cookie store. Webhook has no cookies.
// I need a SUPABASE_ADMIN client.
// I'll assume for this file we need to import a way to create an admin client or just use standard fetch if we have the key.
// Let's prompt user for SERVICE_ROLE_KEY if I can't find it. 
// For now, I will write the code assuming a `createAdminClient` or similar, or just using direct `supabase-js` with a secret key.

// Let's check if the user has a service role key.
// ... actually I'll write the code to use `process.env.SUPABASE_SERVICE_ROLE_KEY`.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
// import { CREDIT_PACKAGES, PackageId } from '@/lib/constants/creditPackages' // Legacy
import { sendEmail } from '@/utils/email';
import { generateVoucherPDF } from '@/utils/pdf-generator';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
})

export async function POST(req: Request) {
    const body = await req.text()
    const signature = (await headers()).get('stripe-signature') as string

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (err: any) {
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
    }

    // Use service role key to bypass RLS since webhook is not a logged-in user
    const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session

        // CHECK FOR VOUCHER
        if (session.metadata?.type === 'voucher') {
            const {
                userId,
                productId,
                recipientEmail,
                senderName,
                message,
                creditAmount
            } = session.metadata;

            // Generate Code
            const generateCode = () => {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let result = '';
                for (let i = 0; i < 8; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return result;
            }
            const code = generateCode();

            // Insert Voucher
            const { error: insertError } = await supabase
                .from('vouchers')
                .insert({
                    code: code,
                    product_id: productId,
                    purchaser_id: userId === 'guest' ? null : userId, // Handle guest
                    recipient_email: recipientEmail,
                    sender_name: senderName,
                    message: message,
                    credit_amount: parseInt(creditAmount),
                    status: 'active'
                });

            if (insertError) {
                console.error('Error inserting voucher:', insertError);
                return new NextResponse('Database Error', { status: 500 });
            }

            // CREATE INVOICE FOR VOUCHER
            const invNum = await generateNextInvoiceNumber(supabase);

            // Extract billing details from metadata (passed in Guest Form) or session customer_details
            // We need to ensure these are passed in metadata or we fallback to something?
            // In GuestVoucherForm we didn't pass exact billing columns to metadata yet!
            // WAIT. createVoucherCheckoutSession needs to put them in metadata!
            // I need to update createVoucherCheckoutSession first/as well to pass these billing fields into metadata.
            // But let's assume they are in metadata for now and I will update stripe.ts next.

            const billingData = {
                billing_name: session.metadata?.billing_name || session.customer_details?.name,
                billing_address: session.metadata?.billing_street || session.customer_details?.address?.line1,
                billing_city: session.metadata?.billing_city || session.customer_details?.address?.city,
                billing_zip: session.metadata?.billing_zip || session.customer_details?.address?.postal_code,
                billing_country: session.metadata?.billing_country || session.customer_details?.address?.country || 'Slovensko',
                customer_email: session.customer_details?.email // Important for guest
            };

            const { error: invoiceError } = await supabase.from('invoices').insert({
                user_id: userId === 'guest' ? null : userId,
                invoice_number: invNum,
                description: `Nákup: Darčekový poukaz (${creditAmount} vstupov)`,
                amount: (session.amount_total || 0) / 100,
                currency: session.currency || 'eur',
                stripe_payment_id: session.payment_intent as string,
                status: 'paid',
                // New Billing Columns
                billing_name: billingData.billing_name,
                billing_address: billingData.billing_address,
                billing_city: billingData.billing_city,
                billing_zip: billingData.billing_zip,
                billing_country: billingData.billing_country,
                customer_email: billingData.customer_email
            });
            if (invoiceError) console.error('Error creating invoice for voucher:', invoiceError);

            // Send Email (Voucher)
            // Need to import template helper inside the function or file
            const { getEmailTemplate } = await import('@/utils/email-template'); // Lazy import
            // const { generateVoucherPDF } = await import('@/utils/pdf-generator'); // Removed dynamic import

            // Generate PDF
            let pdfBuffer: Buffer | undefined;
            try {
                // Ensure creditAmount is a valid number
                const amount = parseInt(creditAmount);
                if (isNaN(amount)) {
                    console.error('Invalid credit amount for PDF:', creditAmount);
                }

                pdfBuffer = await generateVoucherPDF({
                    code: code,
                    amount: isNaN(amount) ? 0 : amount,
                    sender: senderName || 'Neznámy odosielateľ',
                    message: message || ''
                });
                console.log('PDF Generated Successfully inside webhook. Buffer length:', pdfBuffer.length);
            } catch (pdfError) {
                console.error('CRITICAL: Error generating PDF in webhook:', pdfError);
            }

            const voucherHtml = getEmailTemplate(
                `Dostal si darček od ${senderName}!`,
                `
                <h1 style="color: #5E715D; text-align: center;">Máš darček!</h1>
                <p style="font-size: 16px;">Dobrý deň,</p>
                <p style="font-size: 16px;"><strong>${senderName}</strong> Vám posiela ${creditAmount} vstupov do Oasis Lounge.</p>
                
                <div style="background-color: #f9f9f9; border: 2px dashed #5E715D; padding: 20px; text-align: center; margin: 30px 0;">
                    <p style="margin: 0; font-size: 14px; color: #666;">Váš kód voucheru:</p>
                    <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #333; letter-spacing: 2px;">${code}</p>
                </div>

                ${message ? `<p style="font-style: italic; text-align: center; color: #666; margin-bottom: 30px;">"${message}"</p>` : ''}

                <div style="text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk'}" class="button">Uplatniť voucher</a>
                </div>
                `,
                `Váš kód voucheru: ${code}`
            );

            await sendEmail({
                to: recipientEmail,
                subject: `Dostal si darček od ${senderName}!`,
                html: voucherHtml,
                attachments: pdfBuffer ? [{
                    filename: `voucher-oasis-${code}.pdf`,
                    content: pdfBuffer
                }] : []
            });

            // Send Email (Confirmation to Buyer)
            if (session.customer_details?.email) {
                const { getEmailTemplate } = await import('@/utils/email-template'); // Ensure import available

                const buyerHtml = getEmailTemplate(
                    'Potvrdenie nákupu',
                    `
                    <h1 style="color: #5E715D;">Ďakujeme za nákup!</h1>
                    <p>Váš darčekový poukaz bol úspešne vytvorený a odoslaný príjemcovi (${recipientEmail}).</p>
                    <div class="highlight-box">
                        <p style="margin: 5px 0;"><strong>Kód voucheru:</strong> ${code}</p>
                        <p style="margin: 5px 0;"><strong>Hodnota:</strong> ${creditAmount} vstupov</p>
                        <p style="margin: 5px 0;"><strong>Správa:</strong> "${message}"</p>
                    </div>
                    `
                );

                // Generate Invoice PDF for Voucher
                let invoicePdfBuffer: Buffer | undefined;
                try {
                    const { generateInvoicePDF } = await import('@/utils/pdf-generator');
                    const { COMPANY_DETAILS } = await import('@/lib/constants/company');

                    // Re-use logic for invoice number generation or pass it if possible? 
                    // We generated invNum earlier. 

                    const billingDetails = {
                        name: billingData.billing_name || session.customer_details?.name || 'Zákazník',
                        address: [
                            billingData.billing_address,
                            billingData.billing_zip,
                            billingData.billing_city,
                            billingData.billing_country
                        ].filter(Boolean).join(', ') || session.customer_details?.address?.line1 || ''
                    };

                    invoicePdfBuffer = await generateInvoicePDF({
                        invoiceNumber: invNum,
                        date: new Date().toLocaleDateString('sk-SK'),
                        amount: (session.amount_total || 0) / 100,
                        currency: session.currency || 'eur',
                        description: `Nákup: Darčekový poukaz (${creditAmount} vstupov)`,
                        buyerName: billingDetails.name,
                        buyerAddress: billingDetails.address,
                        supplierName: COMPANY_DETAILS.name,
                        supplierAddress: COMPANY_DETAILS.address,
                        supplierIco: COMPANY_DETAILS.ico,
                        supplierDic: COMPANY_DETAILS.dic,
                        supplierIcdph: COMPANY_DETAILS.icdph,
                        variableSymbol: invNum.replace(/\D/g, '')
                    });
                } catch (pdfError) {
                    console.error('Error generating invoice PDF for voucher:', pdfError);
                }

                const attachments = [];
                if (pdfBuffer) {
                    attachments.push({
                        filename: `voucher-oasis-${code}.pdf`,
                        content: pdfBuffer
                    });
                }
                if (invoicePdfBuffer) {
                    attachments.push({
                        filename: `faktura-${invNum}.pdf`,
                        content: invoicePdfBuffer
                    });
                }

                await sendEmail({
                    to: session.customer_details.email, // or session.customer_email
                    subject: `Potvrdenie nákupu - Darčekový poukaz`,
                    html: buyerHtml,
                    attachments: attachments
                });
            }

            return new NextResponse(null, { status: 200 })
        }

        // EXISTING CREDIT LOGIC
        const userId = session.metadata?.userId
        // packageId is now a UUID from DB, so we don't check against CREDIT_PACKAGES constant
        const packageName = session.metadata?.packageName

        // Parse credits directly from metadata (trusted source from our createCheckoutSession)
        const credits = parseInt(session.metadata?.credits || '0')
        const bonus = parseInt(session.metadata?.bonus || '0')
        const creditsToAdd = credits + bonus
        const appliedCouponId = session.metadata?.appliedCouponId;

        if (userId && creditsToAdd > 0) {

            // 1. Get current credits
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('credits')
                .eq('id', userId)
                .single()

            if (fetchError) {
                console.error('Error fetching profile:', fetchError)
                return new NextResponse('Database Error', { status: 500 })
            }

            // CHECK FOR UNLIMITED PACKAGE
            // We identify unlimited by high credit count (e.g. > 5000) or title
            const isUnlimited = creditsToAdd > 5000;

            let newCredits = profile?.credits || 0;
            let oneYearFromNow: Date | null = null;

            if (isUnlimited) {
                // Set unlimited_expires_at to 1 year from now
                oneYearFromNow = new Date();
                oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        unlimited_expires_at: oneYearFromNow.toISOString(),
                    })
                    .eq('id', userId)

                if (updateError) {
                    console.error('Error updating unlimited status:', updateError)
                    return new NextResponse('Database Update Error', { status: 500 })
                }
            } else {
                // NORMAL CREDIT UPDATE
                const currentCredits = profile?.credits || 0
                newCredits = currentCredits + creditsToAdd

                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ credits: newCredits })
                    .eq('id', userId)

                if (updateError) {
                    console.error('Error updating credits:', updateError)
                    return new NextResponse('Database Update Error', { status: 500 })
                }
            }

            // UPLATNENIE KUPÓNU (ak bol nejaký pri platbe použitý)
            if (appliedCouponId) {
                const { data: currentCoupon } = await supabase
                    .from('discount_coupons')
                    .select('target_user_id, usage_count')
                    .eq('id', appliedCouponId)
                    .single();

                if (currentCoupon) {
                    if (currentCoupon.target_user_id === null) {
                        // Universal coupon - increment usage
                        const { error: couponUpdateError } = await supabase
                            .from('discount_coupons')
                            .update({ usage_count: (currentCoupon.usage_count || 0) + 1 })
                            .eq('id', appliedCouponId);

                        // Zaznamenať použitie kupónu pre tohto používateľa (ak je k dispozícii userId z metadata)
                        if (userId) {
                            await supabase
                                .from('coupon_usages')
                                .insert({ coupon_id: appliedCouponId, user_id: userId });
                        }

                        if (couponUpdateError) {
                            console.error('Error incrementing usage for universal coupon in webhook:', couponUpdateError);
                        }
                    } else {
                        // Personal coupon - mark used
                        const { error: couponUpdateError } = await supabase
                            .from('discount_coupons')
                            .update({ used: true, used_at: new Date().toISOString() })
                            .eq('id', appliedCouponId);

                        if (couponUpdateError) {
                            console.error('Error marking coupon as used in webhook:', couponUpdateError);
                        }
                    }
                }
            }

            // CREATE INVOICE FOR CREDITS
            const invNum = await generateNextInvoiceNumber(supabase);
            const { error: invoiceError } = await supabase.from('invoices').insert({
                user_id: userId,
                invoice_number: invNum,
                description: `Nákup: ${packageName || 'Kreditný balíček'}`,
                amount: (session.amount_total || 0) / 100,
                currency: session.currency || 'eur',
                stripe_payment_id: session.payment_intent as string,
                status: 'paid'
            });
            if (invoiceError) console.error('Error creating invoice for credits:', invoiceError);

            // 4. Send confirmation email
            const userEmail = session.customer_details?.email || session.customer_email || session.metadata?.userEmail;

            if (userEmail) {
                const { getEmailTemplate } = await import('@/utils/email-template');

                const statusLine = isUnlimited && oneYearFromNow
                    ? `<p style="margin: 5px 0;"><strong>Platnosť členstva do:</strong> ${oneYearFromNow.toLocaleDateString('sk-SK')}</p>`
                    : `<p style="margin: 5px 0;"><strong>Nový stav kreditov:</strong> ${newCredits}</p>`;

                const purchaseHtml = getEmailTemplate(
                    'Ďakujeme za Váš nákup!',
                    `
                    <h1 style="color: #5E715D;">Nákup úspešný</h1>
                    <p>Vaša objednávka bola úspešne spracovaná.</p>
                    
                    <div class="highlight-box">
                        <p style="margin: 5px 0;"><strong>Zakúpený balíček:</strong> ${packageName || 'Kreditný balíček'}</p>
                        ${isUnlimited ? '<p style="margin: 5px 0;"><strong>Typ:</strong> Neobmedzené členstvo</p>' : `<p style="margin: 5px 0;"><strong>Kredity:</strong> +${creditsToAdd} vstupov</p>`}
                        ${statusLine}
                    </div>

                    <p>Faktúru k nákupu nájdete v prílohe tohto emailu.</p>

                    <p>Tešíme sa na vašu návštevu v Oasis Lounge.</p>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk'}/dashboard" class="button">Prejsť do aplikácie</a>
                    </div>
                    `
                );

                // Generate Invoice PDF
                let invoicePdfBuffer: Buffer | undefined;
                try {
                    const { generateInvoicePDF } = await import('@/utils/pdf-generator');
                    const { COMPANY_DETAILS } = await import('@/lib/constants/company');

                    invoicePdfBuffer = await generateInvoicePDF({
                        invoiceNumber: invNum,
                        date: new Date().toLocaleDateString('sk-SK'),
                        amount: (session.amount_total || 0) / 100,
                        currency: session.currency || 'eur',
                        description: `Nákup: ${packageName || 'Kreditný balíček'}`,
                        buyerName: session.customer_details?.name || 'Zákazník',
                        buyerAddress: [
                            session.customer_details?.address?.line1,
                            session.customer_details?.address?.city,
                            session.customer_details?.address?.postal_code
                        ].filter(Boolean).join(', ') || '',
                        supplierName: COMPANY_DETAILS.name,
                        supplierAddress: COMPANY_DETAILS.address,
                        supplierIco: COMPANY_DETAILS.ico,
                        supplierDic: COMPANY_DETAILS.dic,
                        supplierIcdph: COMPANY_DETAILS.icdph,
                        variableSymbol: invNum.replace(/\D/g, '')
                    });
                } catch (pdfError) {
                    console.error('Error generating invoice PDF:', pdfError);
                }

                await sendEmail({
                    to: userEmail,
                    subject: `Potvrdenie objednávky - ${packageName || 'Kreditný balíček'}`,
                    html: purchaseHtml,
                    attachments: invoicePdfBuffer ? [{
                        filename: `faktura-${invNum}.pdf`,
                        content: invoicePdfBuffer
                    }] : []
                });
            }
        }
    }

    return new NextResponse(null, { status: 200 })
}

async function generateNextInvoiceNumber(supabase: any) {
    const year = new Date().getFullYear();
    const prefix = `W${year}`;

    // Find the latest invoice for this year
    const { data: latestInvoice, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching latest invoice number:', error);
        // Fallback to random if DB fails? Or fail? Better to fail or fallback to safe random to avoid collision.
        // Let's fallback to random but log error
        return `W${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let nextSequence = 1;
    if (latestInvoice && latestInvoice.invoice_number) {
        // format W20260001
        const lastSequenceStr = latestInvoice.invoice_number.slice(-4);
        const lastSequence = parseInt(lastSequenceStr, 10);
        if (!isNaN(lastSequence)) {
            nextSequence = lastSequence + 1;
        }
    }

    const sequenceStr = String(nextSequence).padStart(4, '0');
    return `${prefix}${sequenceStr}`;
}
