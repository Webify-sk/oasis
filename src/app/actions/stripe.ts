'use server'

import { headers } from 'next/headers'
import Stripe from 'stripe'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PackageId } from '@/lib/constants/creditPackages'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover' as any, // Cast to any to avoid strict type checking if the type definition is slightly off, or just use the string if it matches.
})

export async function createCheckoutSession(
    packageId: PackageId, // Enforce correct IDs
    price: string, // Expecting string like "27 €" or "500 €" - need to parse
    name: string
) {
    const supabase = await createClient()
    try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            redirect('/login')
        }

        // Parse price string to number (cents)
        // Example: "27 €" -> 2700
        const amount = parseInt(price.replace(/[^0-9]/g, '')) * 100

        if (isNaN(amount) || amount <= 0) {
            throw new Error('Invalid price')
        }

        const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

        const session = await stripe.checkout.sessions.create({
            // @ts-ignore
            automatic_payment_methods: {
                enabled: true,
            },
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: name,
                            description: `Credit Package: ${packageId}`,
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
                packageName: name
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
