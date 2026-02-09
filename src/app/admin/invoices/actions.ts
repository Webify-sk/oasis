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

    // Map the result to match the interface if necessary
    // Supabase returns user as an object or array depending on relationship, 
    // strictly speaking it returns what we asked for.
    // We might need to cast or ensure types.

    return data as unknown as AdminInvoice[];
}
