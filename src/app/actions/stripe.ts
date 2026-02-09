'use server'

import { headers } from 'next/headers'
import Stripe from 'stripe'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PackageId } from '@/lib/constants/creditPackages'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
})

export async function createCheckoutSession(
    packageId: string // Ensure this matches DB ID now
) {
    const supabase = await createClient()
    try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            redirect('/login')
        }

        // Check Verification (Skip for staff)
        const { data: profile } = await supabase
            .from('profiles')
            .select('email_verified, role')
            .eq('id', user.id)
            .single()

        const isStaff = profile?.role === 'employee' || profile?.role === 'admin'
        if (!isStaff && profile?.email_verified === false) {
            return { error: 'Pre nákup kreditov musíte mať overený email.' }
        }

        // FETCH PACKAGE FROM DB
        const { data: creditPackage, error: packageError } = await supabase
            .from('credit_packages')
            .select('*')
            .eq('id', packageId)
            .single();

        if (packageError || !creditPackage) {
            console.error('Package fetch error:', packageError);
            throw new Error('Invalid package selected or package not found.');
        }

        if (!creditPackage.is_active) {
            throw new Error('This package is no longer available.');
        }

        // Price is stored in Euros in DB (e.g. 27.00)
        // Stripe expects cents for 'unit_amount'
        const amount = Math.round(creditPackage.price * 100);

        if (isNaN(amount) || amount <= 0) {
            throw new Error('Invalid price calculated from package.')
        }

        const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: creditPackage.title,
                            description: creditPackage.description || `Kreditný balík: ${creditPackage.credits} kreditov`,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${origin}/dashboard/credit?success=true`,
            cancel_url: `${origin}/dashboard/credit?canceled=true`,
            customer_email: user.email,
            metadata: {
                userId: user.id,
                userEmail: user.email || '',
                packageId: packageId,
                packageName: creditPackage.title,
                credits: creditPackage.credits, // Add this for webhook convenience
                bonus: creditPackage.bonus_credits || 0
            }
        })

        if (session.url) {
            return { url: session.url };
        }

    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return { error: error.message || 'Unknown error occurred in checkout session creation' };
    }
}

export async function createVoucherCheckoutSession(
    productId: string,
    price: number, // in EUR
    credits: number,
    recipientEmail: string,
    senderName: string,
    message: string,
    billingData?: {
        billing_name?: string;
        billing_street?: string;
        billing_city?: string;
        billing_zip?: string;
        billing_country?: string;
        customer_email?: string;
        full_name?: string;
    }
) {
    const supabase = await createClient()
    try {
        const { data: { user } } = await supabase.auth.getUser()

        // Allow guest checkout (user can be null)

        const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

        // Determine customer email: Logged in user's email OR billing email provided in form (need to pass this!)
        // Prioritize explicit customer_email from form for guests
        const customerEmail = billingData?.customer_email || user?.email;

        // Prepare Metadata
        // We put billing info into metadata so webhook can read it
        const metadata: any = {
            userId: user?.id || 'guest', // Mark as guest if no user
            userEmail: user?.email || '',
            type: 'voucher',
            productId: productId,
            creditAmount: credits,
            recipientEmail: recipientEmail,
            senderName: senderName,
            message: message,
            isGuest: user ? 'false' : 'true'
        };

        // Add billing fields to metadata if present
        if (billingData) {
            metadata.billing_name = billingData.billing_name || billingData.full_name || '';
            metadata.billing_street = billingData.billing_street || '';
            metadata.billing_city = billingData.billing_city || '';
            metadata.billing_zip = billingData.billing_zip || '';
            metadata.billing_country = billingData.billing_country || '';
            // We don't necessarily need customer_email in metadata if it's already on customer object, but safer to have it
            if (billingData.customer_email) metadata.customer_email = billingData.customer_email;
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Darčekový poukaz (${credits} vstupov)`,
                            description: `Od: ${senderName}`,
                        },
                        unit_amount: Math.round(price * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${origin}/dashboard/gift-vouchers?success=true`, // We might want a different success URL for guests later
            cancel_url: `${origin}/dashboard/gift-vouchers?canceled=true`,
            customer_email: customerEmail, // If null, Stripe asks for it
            metadata: metadata
        })

        if (session.url) {
            return { url: session.url };
        }

    } catch (error: any) {
        console.error('Stripe Voucher Checkout Error:', error);
        return { error: error.message || 'Unknown error occurred' };
    }
}
