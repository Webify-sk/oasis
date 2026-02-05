'use server'

import { createClient } from '@/utils/supabase/server'

export interface Invoice {
    id: string;
    invoice_number: string;
    description: string;
    amount: number;
    date: string; // created_at mapped to string
    created_at: string;
    currency: string;
    status: string;
}

export async function getUserInvoices() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return []
    }

    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching invoices:', error)
        return []
    }

    return data as Invoice[]
}
