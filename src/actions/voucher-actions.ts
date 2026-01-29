'use server';

import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';


const resend = new Resend(process.env.RESEND_API_KEY);

function generateVoucherCode(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, 1, O, 0 for clarity
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function buyVoucher(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Musíte byť prihlásený.' };
    }

    const productId = formData.get('productId') as string;
    const recipientEmail = formData.get('recipientEmail') as string;
    const senderName = formData.get('senderName') as string;
    const message = formData.get('message') as string;

    // 1. Fetch Product
    const { data: product, error: productError } = await supabase
        .from('voucher_products')
        .select('*')
        .eq('id', productId)
        .single();

    if (productError || !product) {
        return { success: false, message: 'Produkt sa nenašiel.' };
    }

    // 2. Mock Payment (Assume success)

    // 3. Generate Code
    const code = generateVoucherCode();

    // 4. Secure Purchase via RPC
    const { data: purchaseResult, error: rpcError } = await supabase.rpc('purchase_voucher', {
        p_product_id: product.id,
        p_code: code,
        p_recipient_email: recipientEmail,
        p_sender_name: senderName,
        p_message: message
    });

    if (rpcError) {
        console.error('Voucher RPC error:', rpcError);
        return { success: false, message: `Chyba DB: ${rpcError.message}` };
    }

    if (!purchaseResult.success) {
        return { success: false, message: purchaseResult.message };
    }


    // 5. Generate PDF
    // Note: jsPDF in Node might need a bit of setup if it relies on browser globals, 
    // but basic text generation usually works. 
    // If this fails, we might need 'pdf-lib' or similar. 
    // For now, we wrap in try/catch to ensure at least DB part works.

    // 5. Generate PDF and Send Email
    try {
        if (!process.env.RESEND_API_KEY) {
            console.error('Missing RESEND_API_KEY');
            return { success: true, message: 'Voucher kúpený, ale email nebol odoslaný (chýba API kľúč). Skontrolujte konzolu.' };
        }

        const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 400]);
        const { width, height } = page.getSize();

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        // Times-Roman often looks more "premium" for vouchers
        const serifFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

        // Colors
        const bgParams = { color: rgb(0.98, 0.98, 0.98) }; // Off-white
        const primaryColor = rgb(0.1, 0.1, 0.1); // Almost Black
        const goldColor = rgb(0.7, 0.5, 0.2); // Gold-ish
        const boxColor = rgb(1, 1, 1); // White

        // 1. Background Fill
        page.drawRectangle({
            x: 0, y: 0, width, height,
            color: bgParams.color,
        });

        // 2. Double Border
        // Outer Line
        page.drawRectangle({
            x: 10, y: 10, width: width - 20, height: height - 20,
            borderColor: goldColor, borderWidth: 1,
            color: undefined,
        });
        // Inner Thick Border
        page.drawRectangle({
            x: 15, y: 15, width: width - 30, height: height - 30,
            borderColor: primaryColor, borderWidth: 3,
            color: undefined,
        });

        // 3. Header: OASIS LOUNGE
        page.drawText('OASIS LOUNGE', {
            x: width / 2 - 75,
            y: height - 60,
            size: 18,
            font: fontBold,
            color: primaryColor,
        });

        // 4. Main Title
        const titleText = 'DARCEKOVY POUKAZ';
        const titleSize = 32;
        const titleWidth = serifFont.widthOfTextAtSize(titleText, titleSize);
        page.drawText(titleText, {
            x: (width - titleWidth) / 2,
            y: height - 100,
            size: titleSize,
            font: serifFont,
            color: goldColor,
        });

        // 5. Value
        const valueText = `${product.credit_amount} VSTUPOV`;
        const valueSize = 20;
        const valueWidth = fontBold.widthOfTextAtSize(valueText, valueSize);
        page.drawText(valueText, {
            x: (width - valueWidth) / 2,
            y: height - 140,
            size: valueSize,
            font: fontBold,
            color: primaryColor,
        });

        // Separator Line
        page.drawLine({
            start: { x: 150, y: height - 160 },
            end: { x: 450, y: height - 160 },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8)
        });

        // 6. From / To info
        const fromText = `Od: ${senderName}`;
        page.drawText(fromText, {
            x: (width - font.widthOfTextAtSize(fromText, 14)) / 2,
            y: height - 190,
            size: 14,
            font: font,
            color: primaryColor,
        });

        if (message) {
            // Check message length/wrapping roughly
            const cleanMessage = message.replace(/\n/g, ' ').slice(0, 80); // Simple truncation for safety
            page.drawText(`"${cleanMessage}"`, {
                x: (width - font.widthOfTextAtSize(`"${cleanMessage}"`, 11)) / 2,
                y: height - 210,
                size: 11,
                font: font,
                color: rgb(0.4, 0.4, 0.4), // Grey
            });
        }

        // 7. Code Box (Center Bottom)
        const codeBoxY = 60;
        const codeBoxHeight = 50;
        const codeBoxWidth = 240;
        const codeBoxX = (width - codeBoxWidth) / 2;

        page.drawRectangle({
            x: codeBoxX,
            y: codeBoxY,
            width: codeBoxWidth,
            height: codeBoxHeight,
            color: boxColor,
            borderColor: goldColor,
            borderWidth: 2,
        });

        const codeTextSize = 24;
        const codeTextWidth = fontBold.widthOfTextAtSize(code, codeTextSize);
        page.drawText(code, {
            x: codeBoxX + (codeBoxWidth - codeTextWidth) / 2,
            y: codeBoxY + (codeBoxHeight - codeTextSize) / 2 + 5, // optical center
            size: codeTextSize,
            font: fontBold,
            color: primaryColor,
        });

        page.drawText('KÓD POUKAZU', {
            x: codeBoxX + (codeBoxWidth - font.widthOfTextAtSize('KÓD POUKAZU', 9)) / 2,
            y: codeBoxY + codeBoxHeight + 8,
            size: 9,
            font: font,
            color: rgb(0.5, 0.5, 0.5)
        });

        // 8. Footer
        const footerText = 'Uplatnit na www.oasislounge.sk';
        page.drawText(footerText, {
            x: (width - font.widthOfTextAtSize(footerText, 10)) / 2,
            y: 35,
            size: 10,
            font: font,
            color: rgb(0.6, 0.6, 0.6),
        });

        const pdfBytes = await pdfDoc.save();
        const pdfBuffer = Buffer.from(pdfBytes);

        // 6. Send Email
        console.log(`Sending email to ${recipientEmail}...`);
        const { data, error: emailError } = await resend.emails.send({
            from: 'Oasis Lounge <onboarding@resend.dev>',
            to: [recipientEmail],
            subject: `Dostal si darček od ${senderName}!`,
            html: `
                <h1>Ahoj!</h1>
                <p>Niekto na teba myslí. <strong>${senderName}</strong> ti posiela ${product.credit_amount} vstupov do Oasis Lounge.</p>
                <p>Kód voucheru: <strong>${code}</strong></p>
                <p>Voucher nájdeš aj v prílohe.</p>
            `,
            attachments: [
                {
                    filename: 'Oasis-Voucher.pdf',
                    content: pdfBuffer,
                },
            ],
        });

        if (emailError) {
            console.error('Email send error:', emailError);
            console.log('NOTE: In Resend Test Mode, you can ONLY send to your own email address.');
            return { success: true, message: `Voucher kúpený, ale email zlyhal: ${emailError.message}` };
        }

        console.log('Email sent successfully:', data);

    } catch (err: any) {
        console.error('PDF/Email generation error:', err);
        return { success: true, message: `Voucher kúpený, ale chyba pri generovaní PDF/Emailu: ${err.message}` };
    }

    return { success: true, message: 'Voucher kúpený a odoslaný!' };
}

export async function createVoucherProduct(formData: FormData) {
    const supabase = await createClient();

    // Check admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthorized' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return { success: false, message: 'Unauthorized' };

    const title = formData.get('title') as string;
    const price = parseFloat(formData.get('price') as string);
    const credits = parseInt(formData.get('credits') as string);
    const category = formData.get('category') as string || 'Gift';
    const description = formData.get('description') as string;

    const { error } = await supabase.from('voucher_products').insert({
        title,
        price,
        credit_amount: parseInt(credits.toString()), // Ensure int
        category,
        description,
        is_active: true
    });

    if (error) {
        console.error('Create product error:', error);
        return { success: false, message: `Chyba DB: ${error.message} (${error.code})` };
    }

    return { success: true, message: 'Produkt vytvorený.' };
}
