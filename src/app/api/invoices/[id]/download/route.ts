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

    // 1. Auth Check & Fetch Invoice
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', user.id) // Ensure user owns invoice
        .single();

    if (error || !invoice) {
        return new NextResponse('Invoice not found', { status: 404 });
    }

    // 2. Fetch User Profile for Address details
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // 3. Prepare Data
    const formattedDate = new Date(invoice.created_at).toLocaleDateString('sk-SK');

    // Construct Buyer Address
    const buyerAddress = [
        profile?.billing_street,
        `${profile?.billing_zip || ''} ${profile?.billing_city || ''}`.trim(),
        profile?.billing_country || 'Slovensko'
    ].filter(Boolean).join('\n') || 'Adresa nezadaná';

    const buyerName = profile?.billing_name || profile?.full_name || user.email || 'Zakaznik';

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
            supplierName: 'Oasis Lounge s.r.o.', // Todo: update with real supplier info from user if available? Or verify hardcoded.
            supplierAddress: 'Zizkova 9\n811 02 Bratislava\nSlovensko',
            supplierIco: 'ICO: 12345678' // Placeholders - user should update. I will notify user.
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
