'use server';

import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/utils/check-role';

export interface AdminInvoice {
    id: string;
    invoice_number: string;
    description: string;
    amount: number;
    created_at: string;
    currency: string;
    status: string;
    variable_symbol: string;
    user_id: string;

    // New Editable Billing fields
    billing_name: string | null;
    billing_street: string | null;
    billing_city: string | null;
    billing_zip: string | null;
    billing_country: string | null;
    discount_amount: number | null;
    service_type: string | null;

    user: {
        email: string;
        full_name: string | null;
    } | null;
}

export async function getAllInvoices() {
    await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('invoices')
        .select(`
            *,
            user:profiles(email, full_name)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all invoices:', error);
        return [];
    }

    return data as unknown as AdminInvoice[];
}

import { revalidatePath } from 'next/cache';

import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function deleteInvoice(invoiceId: string) {
    await requireAdmin();

    // Use Service Role Key to bypass RLS
    const supabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

    if (error) {
        console.error('Error deleting invoice:', error);
        throw new Error('Nepodarilo sa vymazať faktúru.');
    }

    revalidatePath('/admin/invoices');
    return { success: true };
}

export async function updateInvoice(invoiceId: string, updates: Partial<AdminInvoice>) {
    await requireAdmin();

    const supabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    // Map fields matching database columns exactly from Partial<AdminInvoice>
    const updatePayload = {
        description: updates.description,
        amount: updates.amount,
        created_at: updates.created_at,
        status: updates.status,
        variable_symbol: updates.variable_symbol,
        billing_name: updates.billing_name,
        billing_street: updates.billing_street,
        billing_city: updates.billing_city,
        billing_zip: updates.billing_zip,
        billing_country: updates.billing_country,
        discount_amount: updates.discount_amount,
        service_type: updates.service_type
    };

    // Remove undefined values so Supabase doesn't attempt to overwrite them blindly
    Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key as keyof typeof updatePayload] === undefined) {
            delete updatePayload[key as keyof typeof updatePayload];
        }
    });

    const { error } = await supabase
        .from('invoices')
        .update(updatePayload)
        .eq('id', invoiceId);

    if (error) {
        console.error('Error updating invoice:', error);
        throw new Error('Nepodarilo sa aktualizovať faktúru.');
    }

    revalidatePath('/admin/invoices');
    return { success: true };
}
