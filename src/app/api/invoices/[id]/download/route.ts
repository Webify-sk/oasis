import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateInvoicePDF } from '@/utils/pdf-generator';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> } // Params is a promise in Next.js 15+
) {
    const params = await context.params;
    const invoiceId = params.id;
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Check Permissions (Fetch requester profile)
    const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAdmin = requesterProfile?.role === 'admin';

    // 3. Fetch Invoice
    let query = supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId);

    // If not admin, restrict to own invoices
    if (!isAdmin) {
        query = query.eq('user_id', user.id);
    }

    const { data: invoice, error } = await query.single();

    if (error || !invoice) {
        return new NextResponse('Invoice not found', { status: 404 });
    }

    // 4. Fetch Invoice Owner Profile (for PDF Address details)
    // We need the profile of the person who OWNS the invoice
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', invoice.user_id)
        .single();

    // 5. Prepare Data
    const formattedDate = new Date(invoice.created_at).toLocaleDateString('sk-SK');

    // Prioritize Invoice snapshot data over Profile data
    const bStreet = invoice.billing_street || profile?.billing_street || '';
    const bCity = invoice.billing_city || profile?.billing_city || '';
    const bZip = invoice.billing_zip || profile?.billing_zip || '';
    const bCountry = invoice.billing_country || profile?.billing_country || 'Slovensko';

    // Construct Buyer Address
    const buyerAddress = [
        bStreet,
        `${bZip} ${bCity}`.trim(),
        bCountry
    ].filter(Boolean).join('\n') || 'Adresa nezadaná';

    const buyerName = invoice.billing_name || profile?.billing_name || profile?.full_name || 'Zakaznik';

    // 6. Fetch Related Invoice Number if Credit Note
    let relatedInvoiceNumber: string | undefined = undefined;
    if (invoice.document_type === 'credit_note' && invoice.related_invoice_id) {
        const { data: related } = await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('id', invoice.related_invoice_id)
            .single();
        if (related) {
            relatedInvoiceNumber = related.invoice_number;
        }
    }

    // 4. Generate PDF
    try {
        const pdfBuffer = await generateInvoicePDF({
            invoiceNumber: invoice.invoice_number || `INV-${invoiceId.slice(0, 8)}`,
            date: formattedDate,
            amount: parseFloat(invoice.amount),
            currency: invoice.currency || 'eur',
            description: invoice.description || 'Nákup služieb',
            buyerName: buyerName,
            buyerAddress: buyerAddress,
            buyerCompanyName: invoice.company_name || profile?.company_name || undefined,
            buyerIco: invoice.company_ico || profile?.company_ico || undefined,
            buyerDic: invoice.company_dic || profile?.company_dic || undefined,
            buyerIcdph: invoice.company_ic_dph || profile?.company_ic_dph || undefined,
            supplierName: 'Oasis Lounge s.r.o.',
            supplierAddress: 'Pribinova 25\n811 09 Bratislava - mestská časť Staré Mesto\nSlovensko',
            supplierIco: 'IČO: 56418078',
            supplierDic: 'DIČ: 2122300895',
            supplierIcdph: 'IČ DPH: SK2122300895',
            variableSymbol: invoice.variable_symbol,
            serviceType: invoice.service_type,
            discountAmount: invoice.discount_amount ? parseFloat(invoice.discount_amount) : undefined,
            isCreditNote: invoice.document_type === 'credit_note',
            relatedInvoiceNumber: relatedInvoiceNumber
        });

        // 5. Return PDF
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="faktura-${invoice.invoice_number}.pdf"`,
            },
        });

    } catch (err: any) {
        console.error('PDF Generation Error:', err);
        return new NextResponse('Error generating PDF', { status: 500 });
    }
}
