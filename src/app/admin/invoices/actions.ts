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

    // Dobropis properties
    document_type?: 'invoice' | 'credit_note';
    related_invoice_id?: string | null;

    // New Editable Billing fields
    billing_name: string | null;
    billing_street: string | null;
    billing_city: string | null;
    billing_zip: string | null;
    billing_country: string | null;
    company_name: string | null;
    company_ico: string | null;
    company_dic: string | null;
    company_ic_dph: string | null;
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
        company_name: updates.company_name,
        company_ico: updates.company_ico,
        company_dic: updates.company_dic,
        company_ic_dph: updates.company_ic_dph,
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

export async function createCreditNote(invoiceId: string) {
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

    // 1. Fetch original invoice
    const { data: original, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

    if (fetchError || !original) {
        console.error('Error fetching original invoice:', fetchError);
        throw new Error('Pôvodná faktúra sa nenašla.');
    }

    // 2. Check if credit note already exists
    const { data: existingCreditNote } = await supabase
        .from('invoices')
        .select('id')
        .eq('related_invoice_id', invoiceId)
        .eq('document_type', 'credit_note')
        .single();

    if (existingCreditNote) {
        throw new Error('K tejto faktúre už existuje dobropis.');
    }

    // 3. Generate Credit Note Number (DOB + Year + Sequence)
    const year = new Date().getFullYear();
    const prefix = `DOB${year}`;

    const { data: latestDobropis, error: dobError } = await supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', `${prefix}%`)
        .eq('document_type', 'credit_note')
        .order('invoice_number', { ascending: false })
        .limit(1)
        .single();

    let nextSequence = 1;
    if (latestDobropis && latestDobropis.invoice_number) {
        const lastSequenceStr = latestDobropis.invoice_number.slice(-4);
        const lastSequence = parseInt(lastSequenceStr, 10);
        if (!isNaN(lastSequence)) {
            nextSequence = lastSequence + 1;
        }
    }
    const sequenceStr = String(nextSequence).padStart(4, '0');
    const creditNoteNumber = `${prefix}${sequenceStr}`;

    // 4. Create Credit Note Payload
    // Invert amounts
    const creditAmount = parseFloat(original.amount.toString()) * -1;
    const creditDiscount = original.discount_amount ? parseFloat(original.discount_amount.toString()) * -1 : null;

    const creditNotePayload = {
        user_id: original.user_id,
        invoice_number: creditNoteNumber,
        description: `Dobropis k faktúre č. ${original.invoice_number}`,
        amount: creditAmount,
        currency: original.currency,
        status: 'paid', // Dobropis is technically settled immediately
        document_type: 'credit_note',
        related_invoice_id: original.id,

        // Copy billing details
        billing_name: original.billing_name,
        billing_street: original.billing_street,
        billing_city: original.billing_city,
        billing_zip: original.billing_zip,
        billing_country: original.billing_country,
        discount_amount: creditDiscount,
        service_type: original.service_type,
        variable_symbol: original.variable_symbol
    };

    // 5. Insert Credit Note
    const { error: insertError } = await supabase
        .from('invoices')
        .insert(creditNotePayload);

    if (insertError) {
        console.error('Error creating credit note:', insertError);
        throw new Error('Chyba pri vytváraní dobropisu.');
    }

    // 6. Update original invoice status to refunded
    await supabase
        .from('invoices')
        .update({ status: 'refunded' })
        .eq('id', original.id);

    revalidatePath('/admin/invoices');
    return { success: true };
}
