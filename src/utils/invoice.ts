import { SupabaseClient } from '@supabase/supabase-js';

export async function generateNextInvoiceNumber(supabase: SupabaseClient<any, "public", any> | any) {
    const year = new Date().getFullYear();
    const prefix = `W${year}`;

    // Find the latest invoice for this year
    const { data: latestInvoice, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching latest invoice number:', error);
        // Fallback to random if DB fails to avoid collision
        return `W${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let nextSequence = 1;
    if (latestInvoice && latestInvoice.invoice_number) {
        // format W20260001
        const lastSequenceStr = latestInvoice.invoice_number.slice(-4);
        const lastSequence = parseInt(lastSequenceStr, 10);
        if (!isNaN(lastSequence)) {
            nextSequence = lastSequence + 1;
        }
    }

    const sequenceStr = String(nextSequence).padStart(4, '0');
    return `${prefix}${sequenceStr}`;
}
