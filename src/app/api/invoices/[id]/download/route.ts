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

    // Construct Buyer Address
    const buyerAddress = [
        profile?.billing_street,
        `${profile?.billing_zip || ''} ${profile?.billing_city || ''}`.trim(),
        profile?.billing_country || 'Slovensko'
    ].filter(Boolean).join('\n') || 'Adresa nezadaná';

    const buyerName = profile?.billing_name || profile?.full_name || 'Zakaznik';

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
            supplierName: 'Oasis Lounge s.r.o.',
            supplierAddress: 'Pribinova 25\n811 09 Bratislava - mestská časť Staré Mesto\nSlovensko',
            supplierIco: 'IČO: 56418078',
            supplierDic: 'DIČ: 2122300895',
            supplierIcdph: 'IČ DPH: SK2122300895'
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
