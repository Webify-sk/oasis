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
import { CREDIT_PACKAGES, PackageId } from '@/lib/constants/creditPackages'
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
            const invNum = generateInvoiceNumber();

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

                await sendEmail({
                    to: session.customer_details.email, // or session.customer_email
                    subject: `Potvrdenie nákupu - Darčekový poukaz`,
                    html: buyerHtml,
                    attachments: pdfBuffer ? [{
                        filename: `voucher-oasis-${code}.pdf`,
                        content: pdfBuffer
                    }] : []
                });
            }

            return new NextResponse(null, { status: 200 })
        }

        // EXISTING CREDIT LOGIC
        const userId = session.metadata?.userId
        const packageId = session.metadata?.packageId as PackageId
        const packageName = session.metadata?.packageName

        if (userId && packageId && CREDIT_PACKAGES[packageId]) {
            const creditsToAdd = CREDIT_PACKAGES[packageId].credits

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

            const currentCredits = profile?.credits || 0
            const newCredits = currentCredits + creditsToAdd

            // 2. Update credits
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ credits: newCredits })
                .eq('id', userId)

            if (updateError) {
                console.error('Error updating credits:', updateError)
                return new NextResponse('Database Update Error', { status: 500 })
            }

            // CREATE INVOICE FOR CREDITS
            const invNum = generateInvoiceNumber();
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
            // const packageName = session.metadata?.packageName || 'Kreditný balíček'; // Already defined above

            if (userEmail) {
                const { getEmailTemplate } = await import('@/utils/email-template');
                const purchaseHtml = getEmailTemplate(
                    'Ďakujeme za Váš nákup!',
                    `
                    <h1 style="color: #5E715D;">Nákup úspešný</h1>
                    <p>Vaša objednávka bola úspešne spracovaná a kredity boli pripísané na vaše konto.</p>
                    
                    <div class="highlight-box">
                        <p style="margin: 5px 0;"><strong>Zakúpený balíček:</strong> ${packageName || 'Kreditný balíček'}</p>
                        <p style="margin: 5px 0;"><strong>Kredity:</strong> +${creditsToAdd} vstupov</p>
                        <p style="margin: 5px 0;"><strong>Nový stav kreditov:</strong> ${newCredits}</p>
                    </div>

                    <p>Tešíme sa na vašu návštevu v Oasis Lounge.</p>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk'}/dashboard" class="button">Prejsť do aplikácie</a>
                    </div>
                    `
                );

                await sendEmail({
                    to: userEmail,
                    subject: `Potvrdenie objednávky - ${packageName || 'Kreditný balíček'}`,
                    html: purchaseHtml
                });
            }
        }
    }

    return new NextResponse(null, { status: 200 })
}

function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `FA-${year}${month}${day}-${random}`;
}
