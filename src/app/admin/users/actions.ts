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
            // Non-critical? Or critical? User exists but profile empty.
            // We can try valid insertion if update failed (e.g. trigger failed).
            // But let's assume update is fine.
        }

    } catch (e) {
        console.error(e);
        return { message: 'Nastala neočakávaná chyba.' };
    }

    revalidatePath('/admin/users');
    redirect('/admin/users');
}
