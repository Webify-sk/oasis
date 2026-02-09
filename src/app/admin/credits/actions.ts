'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/utils/check-role';

export type CreditPackage = {
    id: string;
    title: string;
    price: number;
    credits: number;
    bonus_credits: number;
    description: string | null;
    validity_months: number | null;
    is_active: boolean;
    is_popular: boolean;
    created_at: string;
};

export async function getCreditPackages() {
    // Admin view - get all
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .order('price', { ascending: true });

    if (error) {
        console.error('Error fetching credit packages:', error);
        return [];
    }
    return data as CreditPackage[];
}

export async function getActiveCreditPackages() {
    // Public/Client view - active only
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

    if (error) {
        console.error('Error fetching active credit packages:', error);
        return [];
    }
    return data as CreditPackage[];
}

export async function getCreditPackage(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data as CreditPackage;
}

export async function upsertCreditPackage(prevState: any, formData: FormData) {
    await requireAdmin();
    const supabase = await createClient();

    const id = formData.get('id') as string;

    // Parse inputs
    const title = formData.get('title') as string;
    const price = parseFloat(formData.get('price') as string);
    const credits = parseInt(formData.get('credits') as string);
    const bonus_credits = parseInt(formData.get('bonus_credits') as string || '0');
    const description = formData.get('description') as string;
    const validity_months = formData.get('validity_months') ? parseInt(formData.get('validity_months') as string) : null;
    const is_active = formData.get('is_active') === 'on';
    const is_popular = formData.get('is_popular') === 'on';

    const data = {
        title,
        price,
        credits,
        bonus_credits,
        description,
        validity_months,
        is_active,
        is_popular
    };

    let error;

    try {
        if (id) {
            const { error: updateError } = await supabase
                .from('credit_packages')
                .update(data)
                .eq('id', id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('credit_packages')
                .insert(data);
            error = insertError;
        }

        if (error) {
            console.error('DB Error:', error);
            return {
                message: 'Chyba pri ukladaní balíčka: ' + error.message,
                inputs: { ...data, id } // Return inputs for preservation
            };
        }
    } catch (e) {
        console.error('Unexpected Error:', e);
        return {
            message: 'Nastala neočakávaná chyba.',
            inputs: { ...data, id }
        };
    }

    revalidatePath('/admin/credits');
    revalidatePath('/dashboard/credit');
    redirect('/admin/credits');
}

export async function deleteCreditPackage(id: string) {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
        .from('credit_packages')
        .delete()
        .eq('id', id);

    if (error) {
        return { message: 'Chyba pri mazaní balíčka: ' + error.message };
    }

    revalidatePath('/admin/credits');
    revalidatePath('/dashboard/credit');
    return { success: true };
}
