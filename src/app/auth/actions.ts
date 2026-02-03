'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        console.error('Login Error:', error)
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
            data: {
                full_name: formData.get('full_name') as string,
                date_of_birth: formData.get('date_of_birth') as string, // Will be parsed by trigger if updated
            }
        }
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        console.error('Signup Error:', error)
        return { error: error.message }
    }

    // Send Welcome Email
    if (data.email) {
        try {
            const { sendEmail } = await import('@/utils/email'); // Dynamic import to avoid circular dep if any
            const { getEmailTemplate } = await import('@/utils/email-template');

            const loginLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://moja-zona.oasislounge.sk'}`;

            const html = getEmailTemplate(
                'Vitajte v Oasis Lounge!',
                `
                <p>Dobrý deň,</p>
                <p>s radosťou vás vítame v našej komunite. Vaša registrácia prebehla úspešne.</p>
                <p>Teraz sa môžete prihlásiť a rezervovať si svoje prvé tréningy.</p>
                
                <div style="text-align: center;">
                    <a href="${loginLink}" class="button">Prihlásiť sa</a>
                </div>

                <p style="margin-top: 30px;">Tešíme sa na vašu návštevu!</p>
                <p>Tím Oasis Lounge</p>
                `
            );

            await sendEmail({
                to: data.email,
                subject: 'Vitajte v Oasis Lounge!',
                html: html
            });
        } catch (mailError) {
            console.error('Failed to send welcome email:', mailError);
            // Don't block flow
        }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
}

export async function resetPassword(email: string) {
    // 1. Create Supabase Admin Client
    const { createClient: createClientJs } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClientJs(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    // 2. Generate Recovery Link
    // Note: redirectTo should point to the callback that handles the token exchange.
    // Usually Supabase handles the magic link exchange on the client side if the link is clicked.
    // But for 'recovery' type, it logs the user in and they should be redirected to a page where they can set a new password.
    // standard flow: /auth/callback -> exchanges code -> session -> redirects to /dashboard/profile?reset=true
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://moja-zona.oasislounge.sk'}/auth/callback?next=/dashboard/profile?reset=true`,
        }
    });

    if (error) {
        console.error('Reset Password Error:', error);
        return { success: false, message: 'Nepodarilo sa vygenerovať link pre obnovu hesla. Skontrolujte email.' };
    }

    // 3. Send Email via Nodemailer
    if (data && data.properties?.action_link) {
        try {
            const { sendEmail } = await import('@/utils/email');
            const { getEmailTemplate } = await import('@/utils/email-template');

            const html = getEmailTemplate(
                'Obnovenie hesla',
                `
                <p>Dobrý deň,</p>
                <p>dostali sme žiadosť o obnovenie hesla pre váš účet.</p>
                <p>Kliknite na tlačidlo nižšie pre nastavenie nového hesla:</p>
                
                <div style="text-align: center;">
                    <a href="${data.properties.action_link}" class="button">Obnoviť heslo</a>
                </div>

                <p style="font-size: 12px; color: #888; margin-top: 30px;">Ak ste o túto zmenu nežiadali, tento email môžete ignorovať.</p>
                `
            );

            await sendEmail({
                to: email,
                subject: 'Obnovenie hesla - Oasis Lounge',
                html: html
            });
            return { success: true, message: 'Email na obnovenie hesla bol odoslaný.' };
        } catch (mailError) {
            console.error('Failed to send reset email:', mailError);
            return { success: false, message: 'Chyba pri odosielaní emailu.' };
        }
    }

    return { success: false, message: 'Nepodarilo sa spracovať požiadavku.' };
}
