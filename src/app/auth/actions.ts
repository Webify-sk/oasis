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

    const { data: authData, error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        console.error('Login Error:', error)
        return { error: error.message }
    }

    // Check Role for Redirect
    let redirectUrl = '/dashboard';
    if (authData.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authData.user.id)
            .single();

        if (profile?.role === 'admin') {
            redirectUrl = '/admin/users';
        }
    }

    revalidatePath('/', 'layout')
    redirect(redirectUrl)
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

    // 1. Sign Up
    const { data: authData, error } = await supabase.auth.signUp(data)

    if (error) {
        console.error('Signup Error:', error)
        return { error: error.message }
    }

    // 2. Soft Verification Setup
    if (authData.user && authData.user.email) {
        try {
            // Generate simple token (or use uuid if available, but random string is fine for this)
            const token = crypto.randomUUID();

            // Update Profile with Token
            // We assume profile exists due to Trigger. If trigger is slow, this might fail or we might need a small delay/retry?
            // Usually trigger is sync or very fast.
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    verification_token: token,
                    email_verified: false
                })
                .eq('id', authData.user.id);

            if (updateError) {
                console.error('Failed to set verification token:', updateError);
            }

            // Send Verification Email
            const { sendEmail } = await import('@/utils/email');
            const { getEmailTemplate } = await import('@/utils/email-template');

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk';
            const verifyLink = `${baseUrl}/auth/verify-email?token=${token}`;

            const html = getEmailTemplate(
                'Overenie emailu - Oasis Lounge',
                `
                <p>Dobrý deň,</p>
                <p>ďakujeme za registráciu v Oasis Lounge.</p>
                <p>Pre plný prístup k rezerváciám a službám prosím potvrďte svoj email kliknutím na tlačidlo nižšie.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyLink}" class="button" style="display: inline-block; background-color: #5E715D; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Overiť email</a>
                </div>

                <p>Ak ste sa neregistrovali, tento email môžete ignorovať.</p>
                <p>Tím Oasis Lounge</p>
                `
            );

            await sendEmail({
                to: authData.user.email,
                subject: 'Overenie emailu - Oasis Lounge',
                html: html
            });

        } catch (e) {
            console.error('Error in verification flow:', e);
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
    // Hardcoded production URL to ensure correct redirect to Client Page handling hash
    // Updated to live domain
    const redirectTo = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk'}/auth/reset-password`;

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
            redirectTo: redirectTo,
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

// 4. Send "Password Changed" success email
export async function sendPasswordChangedNotification(email: string) {
    try {
        const { sendEmail } = await import('@/utils/email');
        const { getEmailTemplate } = await import('@/utils/email-template');
        const loginLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk'}`;

        const html = getEmailTemplate(
            'Heslo bolo zmenené',
            `
            <h1 style="color: #5E715D; text-align: center;">Heslo úspešne zmenené</h1>
            <p>Dobrý deň,</p>
            <p>Vaše heslo do Oasis Lounge bolo úspešne zmenené.</p>
            <p>Ak ste túto zmenu vykonali vy, všetko je v poriadku.</p>
            
            <div style="text-align: center; margin-top: 20px;">
                <a href="${loginLink}" class="button">Prihlásiť sa</a>
            </div>

            <p style="font-size: 12px; color: #888; margin-top: 30px;">Ak ste túto zmenu nevykonali, okamžite nás kontaktujte.</p>
            `
        );

        await sendEmail({
            to: email,
            subject: 'Zmena hesla - Oasis Lounge',
            html: html
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to send password change notification:', error);
        return { success: false, error: 'Failed to send email' };
    }
}
