import { NextRequest, NextResponse } from 'next/server';
import { generateVoucherPDF } from '@/utils/pdf-generator';

export async function GET(request: NextRequest) {
    try {
        const pdfBuffer = await generateVoucherPDF({
            code: 'OASIS-GIFT-2024',
            amount: 10,
            sender: 'Ján Novák',
            message: 'Všetko najlepšie k narodeninám! Uži si relax a pohyb v Oasis Lounge. Tvoj priateľ Peter.',
            expiryDate: '31.12.2024'
        });

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="preview-voucher.pdf"', // INLINE to open in browser
            },
        });
    } catch (error) {
        console.error('Preview Error:', error);
        return new NextResponse('Error generating preview', { status: 500 });
    }
}
