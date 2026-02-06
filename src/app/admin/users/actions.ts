'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function upsertUser(prevState: any, formData: FormData) {
    const supabase = await createClient();

    const id = formData.get('id') as string;
    const full_name = formData.get('full_name') as string;
    const phone = formData.get('phone') as string;
    const credits = parseInt(formData.get('credits') as string) || 0;
    const role = formData.get('role') as string;

    // Note: Email is usually handled by Auth, updating it here in 'profiles' doesn't update Auth email.
    // For now, we only update profile fields.

    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name,
                phone,
                credits,
                role,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating user:', error);
            return { message: 'Chyba pri ukladaní užívateľa: ' + error.message };
        }


    } catch (e) {
        return { message: 'Nastala neočakávaná chyba.' };
    }

    // Handle Employee Promotion
    if (role === 'employee') {
        // We need email. For existing users, it was passed via readOnly input.
        const email = formData.get('email') as string;
        if (email) {
            const { promoteToEmployee } = await import('@/actions/cosmetic-actions');
            await promoteToEmployee(id, full_name, email);
        }
    }

    revalidatePath('/admin/users');
    redirect('/admin/users');
}

import { createAdminClient } from '@/utils/supabase/admin';

export async function createUser(fromState: any, formData: FormData) {
    const supabaseAdmin = createAdminClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const full_name = formData.get('full_name') as string;
    const phone = formData.get('phone') as string;
    const credits = parseInt(formData.get('credits') as string) || 0;
    const role = formData.get('role') as string;

    try {
        // 1. Create Auth User
        const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name }
        });

        if (authError) {
            console.error('Auth create error:', authError);
            return { message: 'Chyba pri vytváraní užívateľa: ' + authError.message };
        }

        if (!user) {
            return { message: 'Nepodarilo sa vytvoriť užívateľa.' };
        }

        // 2. Update Profile (Profile is auto-created by trigger? Or we manually upsert?)
        // Usually trigger handles insertion, so we update it.
        // Let's wait a bit or try update immediately. 
        // Best practice: just update specific fields.

        const supabase = await createClient(); // Standard client for RLS checks if needed, but admin client is safer here for immediate consistency if trigger laggy?
        // Actually, let's use admin client to update profile to be sure we bypass RLS if my admin user isn't properly set up yet for insertion? 
        // But 'upsertUser' used standard client. 
        // Let's use standard client, assuming RLS allows admin to update any profile.

        // Wait for trigger? Or insert if not exists?
        // Note: 'create_profile_for_new_user' trigger usually does INSERT.
        // So we UPDATE.

        // Small delay might be needed if trigger is async? Triggers in Postgres are synchronous inside transaction usually?
        // Auth createUser is one transaction. Trigger runs after user insert. 
        // So profile SHOULD exist.

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                full_name,
                phone,
                credits,
                role,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (profileError) {
            console.error('Profile update error:', profileError);
        }

        // 3. Send Verification Email (Soft Verification)
        try {
            const token = crypto.randomUUID();

            await supabaseAdmin
                .from('profiles')
                .update({
                    verification_token: token,
                    email_verified: false
                })
                .eq('id', user.id);

            const { sendEmail } = await import('@/utils/email');
            const { getEmailTemplate } = await import('@/utils/email-template');

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk';
            const verifyLink = `${baseUrl}/auth/verify-email?token=${token}`;

            const html = getEmailTemplate(
                'Overenie emailu - Oasis Lounge',
                `
                <p>Dobrý deň,</p>
                <p>bol vám vytvorený nový účet v Oasis Lounge.</p>
                <p>Pre plný prístup k rezerváciám a službám prosím potvrďte svoj email kliknutím na tlačidlo nižšie.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyLink}" class="button" style="display: inline-block; background-color: #5E715D; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Overiť email</a>
                </div>

                <p>Vaše prihlasovacie meno je tento email a heslo vám bolo nastavené administrátorom.</p>
                <p>Tím Oasis Lounge</p>
                `
            );

            await sendEmail({
                to: email,
                subject: 'Vitajte v Oasis Lounge - Overenie emailu',
                html: html
            });

        } catch (mailError) {
            console.error('Failed to send verification email:', mailError);
        }

        // Handle Employee Promotion
        if (role === 'employee') {
            const { promoteToEmployee } = await import('@/actions/cosmetic-actions');
            await promoteToEmployee(user.id, full_name, email);
        }

    } catch (e) {
        console.error(e);
        return { message: 'Nastala neočakávaná chyba.' };
    }

    // Handle Employee Promotion
    if (role === 'employee') {
        // In createUser, email is definitely in formData
        const { promoteToEmployee } = await import('@/actions/cosmetic-actions');
        // We reuse the new user.id (which was fetched from auth creation) not just formData? 
        // Wait, createUser uses `user.id` from auth response.
        // We need to pass THAT id.
        // But `createUser` function implementation:
        // `step 1: const { data: { user } ... }`
        // So we should capture `user.id` inside the try/catch or ensure it's available here.
        // The snippet above is outside try/catch? No, previous implementation had try/catch wrapping everything.
        // Let's look at the original file structure provided in context. 
        // Ah, I need to be careful where I insert this.
        // The previous `replace_file_content` was targeting `upsertUser` end block. 
        // Now `createUser` is huge.
        // I should target the end of `createUser` before redirect, but make sure `user` object is accessible or use `id` if available.
        // Actually `createUser` returns early if error. 
        // But `user` variable scope is inside `try`.
        // I should put this logic INSIDE the `try` block after profile update.
    }

    revalidatePath('/admin/users');
    redirect('/admin/users');
}

export async function deleteUser(userId: string) {
    const supabaseAdmin = createAdminClient();

    try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            console.error('Delete User Error:', error);
            return { success: false, message: 'Nepodarilo sa vymazať užívateľa: ' + error.message };
        }

        revalidatePath('/admin/users');
        return { success: true };
    } catch (e) {
        console.error('Delete User Exception:', e);
        return { success: false, message: 'Nastala neočakávaná chyba.' };
    }
}
