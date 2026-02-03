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
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard/profile`,
    });

    // Note: Supabase sends the email automatically if configured. 
    // If we want to send a CUSTOM email *instead* (and disable Supabase mailer), we would generate a link manually.
    // However, since we might be using Supabase's built-in mailer for auth, calling `resetPasswordForEmail` triggers it.
    // If the user wants a notification that "Reset was requested" (less common) or if they want to OVERRIDE.
    // Given the prompt "User will change password", it usually means notification of CHANGE.
    // This function triggers the REQUEST. The actual change happens after they click the link.
    // I will add a notification here that "Instructions were sent" if needed, but standard practice is to let Supabase handle the "Reset Password" email itself.
    // BUT, since we are setting up custom SMTP in .env for Nodemailer, Supabase might NOT be using it unless configured in Supabase Dashboard.
    // If Supabase Dashboard is NOT configured with these SMTP settings, the email won't go via WebSupport.
    // CRITICAL: Supabase Auth emails are sent by Supabase servers unless "Custom SMTP" is on in Supabase.
    // We cannot easily intercept the "token" here to send our own email without using Admin API to generate link.
    // I will assume for now Supabase sends the logic. 
    // IF we want to send a notification AFTER they change it (in the updateProfile or callback), that's different.

    // START_CHANGE: Sending a separate "We received your request" email is redundant if Supabase sends one.
    // I'll leave this as is for now implies "User will change password" -> Notification of SUCCESSFUL change is better.
    // I will add that in `updateUser` (if I find it) or just rely on this flow for the "Reset" part.
    // Let's stick to the plan: "User will change password" -> best place is likely after successful update.

    // Let's NOT add code here that duplicates Supabase's job yet. 


    if (error) {
        console.error('Reset Password Error:', error);
        return { success: false, message: error.message };
    }

    return { success: true, message: 'Email na obnovenie hesla bol odoslaný.' };
}
