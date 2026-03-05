import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateInvoicePDF } from '@/utils/pdf-generator';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Check Permissions
    const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAdmin = requesterProfile?.role === 'admin';
    if (!isAdmin) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        const body = await request.json();
        const { invoiceIds } = body as { invoiceIds: string[] };

        if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
            return new NextResponse('No invoice IDs provided', { status: 400 });
        }

        // 3. Fetch Invoices and process one by one
        const zip = new JSZip();

        for (const invoiceId of invoiceIds) {
            const { data: invoice, error } = await supabase
                .from('invoices')
                .select('*')
                .eq('id', invoiceId)
                .single();

            if (error || !invoice) {
                console.warn(`Invoice ${invoiceId} not found, skipping.`);
                continue;
            }

            // Fetch owner profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', invoice.user_id)
                .single();

            const formattedDate = new Date(invoice.created_at).toLocaleDateString('sk-SK');

            // Prioritize Invoice snapshot data over Profile data
            const bStreet = invoice.billing_street || profile?.billing_street || '';
            const bCity = invoice.billing_city || profile?.billing_city || '';
            const bZip = invoice.billing_zip || profile?.billing_zip || '';
            const bCountry = invoice.billing_country || profile?.billing_country || 'Slovensko';

            const buyerAddress = [
                bStreet,
                `${bZip} ${bCity}`.trim(),
                bCountry
            ].filter(Boolean).join('\n') || 'Adresa nezadaná';

            const buyerName = invoice.billing_name || profile?.billing_name || profile?.full_name || 'Zakaznik';

            // Fetch Related Invoice Number if Credit Note
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

            // Generate PDF
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
                supplierIcdph: 'IČ DPH: SK2122300895',
                variableSymbol: invoice.variable_symbol,
                serviceType: invoice.service_type,
                discountAmount: invoice.discount_amount ? parseFloat(invoice.discount_amount) : undefined,
                isCreditNote: invoice.document_type === 'credit_note',
                relatedInvoiceNumber: relatedInvoiceNumber
            });

            // Add to ZIP
            zip.file(`faktura-${invoice.invoice_number || invoiceId.slice(0, 8)}.pdf`, pdfBuffer);
        }

        const zipContent = await zip.generateAsync({ type: 'uint8array' });

        return new NextResponse(zipContent as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="faktury-export-${new Date().toISOString().slice(0, 10)}.zip"`,
            },
        });

    } catch (err: any) {
        console.error('ZIP Generation Error:', err);
        return new NextResponse('Error generating ZIP', { status: 500 });
    }
}
