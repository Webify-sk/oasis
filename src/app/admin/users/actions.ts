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
            return {
                message: 'Chyba pri ukladaní užívateľa: ' + error.message,
                inputs: { full_name, phone, credits, role, email: formData.get('email') }
            };
        }


    } catch (e) {
        return {
            message: 'Nastala neočakávaná chyba.',
            inputs: { full_name, phone, credits, role, email: formData.get('email') }
        };
    }

    // Handle Employee or Trainer Promotion
    if (role === 'employee') {
        const email = formData.get('email') as string;
        if (email) {
            const { promoteToEmployee } = await import('@/actions/cosmetic-actions');
            await promoteToEmployee(id, full_name, email);
        }
    } else if (role === 'trainer') {
        const email = formData.get('email') as string;
        if (email) {
            const { promoteToTrainer } = await import('@/app/admin/trainers/actions');
            await promoteToTrainer(id, full_name, email, phone);
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
    const inputs = { email, full_name, phone, credits, role };

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
            return { message: 'Chyba pri vytváraní užívateľa: ' + authError.message, inputs };
        }

        if (!user) {
            return { message: 'Nepodarilo sa vytvoriť užívateľa.', inputs };
        }

        const supabase = await createClient();

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
            // Don't return here to avoid incomplete state, but logging is good.
            // Or should we fail? If profile update fails, user exists but has wrong role/data.
            // Proceeding might be better than failing hard?
        }

        // 3. Send Welcome Email (No verification needed)
        try {
            const { sendEmail } = await import('@/utils/email');
            const { getEmailTemplate } = await import('@/utils/email-template');

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk';

            const html = getEmailTemplate(
                'Vitajte v Oasis Lounge',
                `
                <p>Dobrý deň,</p>
                <p>bol vám vytvorený nový účet v Oasis Lounge.</p>
                <p>Môžete sa prihlásiť a získať plný prístup k rezerváciám a službám.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${baseUrl}" class="button" style="display: inline-block; background-color: #5E715D; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Prihlásiť sa</a>
                </div>

                <p>Vaše prihlasovacie meno je tento email a heslo vám bolo nastavené administrátorom.</p>
                <p>Tím Oasis Lounge</p>
                `
            );

            await sendEmail({
                to: email,
                subject: 'Vitajte v Oasis Lounge',
                html: html
            });

        } catch (mailError) {
            console.error('Failed to send welcome email:', mailError);
        }

        // Handle Employee or Trainer Promotion
        if (role === 'employee') {
            const { promoteToEmployee } = await import('@/actions/cosmetic-actions');
            await promoteToEmployee(user.id, full_name, email);
        } else if (role === 'trainer') {
            const { promoteToTrainer } = await import('@/app/admin/trainers/actions');
            await promoteToTrainer(user.id, full_name, email, phone);
        }

    } catch (e) {
        console.error(e);
        return { message: 'Nastala neočakávaná chyba.', inputs };
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
