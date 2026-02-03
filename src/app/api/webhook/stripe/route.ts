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
                    purchaser_id: userId,
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

            // Send Email (Voucher)
            // Need to import template helper inside the function or file
            const { getEmailTemplate } = await import('@/utils/email-template'); // Lazy import if needed, or top level. Top level is cleaner if used multiple times but let's stick to consistent pattern.

            const voucherHtml = getEmailTemplate(
                `Dostal si darček od ${senderName}!`,
                `
                <h1 style="color: #5E715D; text-align: center;">Máš darček!</h1>
                <p style="font-size: 16px;">Ahoj,</p>
                <p style="font-size: 16px;"><strong>${senderName}</strong> ti posiela ${creditAmount} vstupov do Oasis Lounge.</p>
                
                <div style="background-color: #f9f9f9; border: 2px dashed #5E715D; padding: 20px; text-align: center; margin: 30px 0;">
                    <p style="margin: 0; font-size: 14px; color: #666;">Tvoj kód voucheru:</p>
                    <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #333; letter-spacing: 2px;">${code}</p>
                </div>

                ${message ? `<p style="font-style: italic; text-align: center; color: #666; margin-bottom: 30px;">"${message}"</p>` : ''}

                <div style="text-align: center;">
                    <a href="https://moja-zona.facilitytest.sk" class="button">Uplatniť voucher</a>
                </div>
                `,
                `Tvoj kód voucheru: ${code}`
            );

            await sendEmail({
                to: recipientEmail,
                subject: `Dostal si darček od ${senderName}!`,
                html: voucherHtml
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
                    html: buyerHtml
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
                        <a href="https://moja-zona.facilitytest.sk/dashboard" class="button">Prejsť do aplikácie</a>
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
