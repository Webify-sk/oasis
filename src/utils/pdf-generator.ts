import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import path from 'path';
import fs from 'fs';

// Helper to remove accents for StandardFonts compatibility (WinAnsi) - ONLY used for default fonts if needed
function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function generateVoucherPDF(data: {
    code: string;
    amount: number;
    sender: string;
    message?: string;
    expiryDate?: string;
}) {
    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();

    // Register fontkit to support custom fonts
    pdfDoc.registerFontkit(fontkit);

    // Embed Custom Font (Times New Roman for Diacritics - System Font)
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'TimesNewRoman.ttf');
    let customFont;

    if (fs.existsSync(fontPath)) {
        try {
            const fontBytes = fs.readFileSync(fontPath);
            customFont = await pdfDoc.embedFont(fontBytes);
        } catch (e) {
            console.error('Error embedding custom font:', e);
        }
    } else {
        console.warn('Custom font not found, falling back to Helvetica:', fontPath);
    }

    // Embed Standard Fonts as fallback or for specific styling
    const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Use custom font if available, otherwise standard
    const mainFont = customFont || fontHelvetica;
    const boldFont = customFont || fontHelveticaBold;

    // A5 Landscape: 210mm x 148mm
    const width = 595.28;
    const height = 419.53;

    const page = pdfDoc.addPage([width, height]);

    // Ensure colors are correct
    const BROWN = rgb(0.549, 0.459, 0.408); // #8C7568
    const LIGHT_BEIGE = rgb(0.992, 0.957, 0.918); // #FDF4EA
    const GOLD_ACCENT = rgb(0.784, 0.690, 0.647); // #C8B0A5

    // Background
    page.drawRectangle({
        x: 0, y: 0, width, height,
        color: LIGHT_BEIGE,
    });

    // Borders
    const margin = 20;
    page.drawRectangle({
        x: margin, y: margin,
        width: width - (margin * 2),
        height: height - (margin * 2),
        borderColor: BROWN,
        borderWidth: 2,
        color: undefined,
    });

    page.drawRectangle({
        x: margin + 5, y: margin + 5,
        width: width - (margin * 2) - 10,
        height: height - (margin * 2) - 10,
        borderColor: GOLD_ACCENT,
        borderWidth: 1,
        color: undefined,
    });

    let y = height - 40;

    // Logo
    const logoPath = path.join(process.cwd(), 'public', 'Logo_Brown.png');
    if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoWidth = 120; // Slightly wider for this logo format
        const logoScale = logoWidth / logoImage.width;
        const logoHeight = logoImage.height * logoScale;

        page.drawImage(logoImage, {
            x: (width - logoWidth) / 2,
            y: y - logoHeight,
            width: logoWidth,
            height: logoHeight,
        });
        y -= (logoHeight + 50);
    } else {
        y -= 40;
    }

    // Title
    const title = 'DARČEKOVÝ POUKAZ';
    const titleSize = 32;
    const titleWidth = mainFont.widthOfTextAtSize(title, titleSize);
    page.drawText(title, {
        x: (width - titleWidth) / 2,
        y: y,
        size: titleSize,
        font: mainFont,
        color: BROWN,
    });
    y -= 50;

    // Amount
    const amountText = `${data.amount} VSTUPOV`;
    const amountSize = 24;
    const amountWidth = mainFont.widthOfTextAtSize(amountText, amountSize);
    page.drawText(amountText, {
        x: (width - amountWidth) / 2,
        y: y,
        size: amountSize,
        font: mainFont,
        color: rgb(0.2, 0.2, 0.2),
    });
    y -= 30;

    // Separator
    page.drawLine({
        start: { x: width / 2 - 40, y },
        end: { x: width / 2 + 40, y },
        thickness: 1,
        color: GOLD_ACCENT,
    });
    y -= 40;

    // Details logic
    const drawCenteredText = (text: string, yPos: number, size: number, color = rgb(0.2, 0.2, 0.2)) => {
        const w = mainFont.widthOfTextAtSize(text, size);
        page.drawText(text, {
            x: (width - w) / 2,
            y: yPos,
            size,
            font: mainFont,
            color
        });
    };

    drawCenteredText(`Daruje: ${data.sender}`, y, 16);
    y -= 30;

    if (data.message) {
        const msg = `"${data.message}"`;
        const msgSize = 12;
        drawCenteredText(msg, y, msgSize, rgb(0.4, 0.4, 0.4));
        y -= 40;
    } else {
        y -= 10;
    }

    // Code Box
    const boxWidth = 200;
    const boxHeight = 50;
    const boxX = (width - boxWidth) / 2;
    const boxY = y - 40;

    page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 1, 1),
        borderColor: BROWN,
        borderWidth: 1,
    });

    const code = data.code;
    const codeSize = 24;
    const codeWidth = mainFont.widthOfTextAtSize(code, codeSize);
    page.drawText(code, {
        x: (width - codeWidth) / 2,
        y: boxY + (boxHeight - codeSize) / 2 + 5,
        size: codeSize,
        font: mainFont,
        color: BROWN
    });

    page.drawText('KÓD POUKAZU', {
        x: (width - mainFont.widthOfTextAtSize('KÓD POUKAZU', 10)) / 2,
        y: boxY + boxHeight + 5,
        size: 10,
        font: mainFont,
        color: rgb(0.6, 0.6, 0.6)
    });

    // Footer
    const footerText = 'www.oasislounge.sk';
    page.drawText(footerText, {
        x: (width - mainFont.widthOfTextAtSize(footerText, 12)) / 2,
        y: 45,
        size: 12,
        font: mainFont,
        color: BROWN
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

export async function generateInvoicePDF(data: {
    invoiceNumber: string;
    date: string;
    amount: number;
    currency: string;
    description: string;
    buyerName: string;
    buyerAddress?: string;
    supplierName: string;
    supplierAddress: string;
    supplierIco?: string;
    supplierDic?: string;
    supplierIcdph?: string;
    variableSymbol?: string;
}) {
    const pdfDoc = await PDFDocument.create();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    // Load Logo Logic 
    let logoImage;
    try {
        const fs = await import('fs');
        const path = await import('path');
        const logoPath = path.join(process.cwd(), 'public', 'Logo_Brown.png');
        if (fs.existsSync(logoPath)) {
            const logoBytes = fs.readFileSync(logoPath);
            logoImage = await pdfDoc.embedPng(logoBytes);
        }
    } catch (e) {
        // console.warn('Logo could not be loaded for PDF', e);
    }

    const drawText = (text: string, x: number, y: number, size: number = 10, isBold: boolean = false, color = rgb(0, 0, 0), align: 'left' | 'right' | 'center' = 'left') => {
        const cleanText = removeAccents(text);
        const textWidth = (isBold ? fontBold : font).widthOfTextAtSize(cleanText, size);
        let xPos = x;
        if (align === 'right') xPos = x - textWidth;
        if (align === 'center') xPos = x - textWidth / 2;

        page.drawText(cleanText, {
            x: xPos, y, size, font: isBold ? fontBold : font, color
        });
    };

    const BRAND_GREEN = rgb(0.37, 0.44, 0.36); // #5E715D
    const LIGHT_GRAY = rgb(0.96, 0.96, 0.96);
    const DARK_GRAY = rgb(0.3, 0.3, 0.3);

    // --- Header ---
    // Logo (Left)
    if (logoImage) {
        const scale = 50 / logoImage.height;
        const logoDims = logoImage.scale(scale);
        page.drawImage(logoImage, {
            x: 50,
            y: height - 50 - logoDims.height,
            width: logoDims.width,
            height: logoDims.height,
        });
    } else {
        drawText('OASIS LOUNGE', 50, height - 60, 20, true, BRAND_GREEN);
    }

    // Invoice Title (Right)
    drawText('FAKTURA', width - 50, height - 60, 24, true, BRAND_GREEN, 'right');
    drawText(`Cislo: ${data.invoiceNumber}`, width - 50, height - 85, 12, false, DARK_GRAY, 'right');

    const topSectionY = height - 130;

    // --- Supplier (Left) ---
    let y = topSectionY;
    page.drawRectangle({ x: 50, y: y - 140, width: 240, height: 160, color: LIGHT_GRAY });

    y -= 20;
    drawText('DODAVATEL', 70, y, 10, true, BRAND_GREEN); y -= 20;
    drawText(data.supplierName, 70, y, 11, true); y -= 15;
    data.supplierAddress.split('\n').forEach(line => {
        drawText(line, 70, y, 10); y -= 12;
    });
    y -= 5;
    if (data.supplierIco) { drawText(data.supplierIco, 70, y, 9, false, DARK_GRAY); y -= 12; }
    if (data.supplierDic) { drawText(data.supplierDic, 70, y, 9, false, DARK_GRAY); y -= 12; }
    if (data.supplierIcdph) { drawText(data.supplierIcdph, 70, y, 9, false, DARK_GRAY); y -= 12; }

    // --- Buyer (Right) ---
    y = topSectionY;
    page.drawRectangle({ x: 300, y: y - 100, width: 245, height: 115, borderColor: LIGHT_GRAY, borderWidth: 1 });

    y -= 20;
    drawText('ODBERATEL', 320, y, 10, true, BRAND_GREEN); y -= 20;
    drawText(data.buyerName, 320, y, 11, true); y -= 15;
    if (data.buyerAddress) {
        data.buyerAddress.split('\n').forEach(line => {
            drawText(line, 320, y, 10); y -= 12;
        });
    } else {
        drawText('Adresa nezadana', 320, y, 10, false, rgb(0.6, 0.6, 0.6));
    }

    // --- Details Bar ---
    y = topSectionY - 180;
    page.drawRectangle({ x: 50, y: y - 20, width: width - 100, height: 35, color: BRAND_GREEN });

    drawText('Datum vystavenia', 70, y - 5, 10, true, rgb(1, 1, 1));
    drawText('Datum dodania', 200, y - 5, 10, true, rgb(1, 1, 1)); // Assumption: same as issue date for services
    drawText('Splatnost', 330, y - 5, 10, true, rgb(1, 1, 1));
    drawText('Variabilny symbol', 460, y - 5, 10, true, rgb(1, 1, 1));

    y -= 35; // Text values row
    drawText(data.date, 70, y, 10);
    drawText(data.date, 200, y, 10);
    drawText(data.date, 330, y, 10); // Paid immediately
    drawText(data.variableSymbol || (data.invoiceNumber ? data.invoiceNumber.replace(/\D/g, '') : ''), 460, y, 10);


    // --- Items Table ---
    y -= 50;
    drawText('POLOZKY', 50, y, 12, true, BRAND_GREEN);
    y -= 10;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    y -= 20;
    drawText(data.description, 50, y, 11);
    drawText('1 ks', 350, y, 11, false, undefined, 'right'); // Quantity placeholder
    drawText(`${data.amount.toFixed(2)} ${data.currency.toUpperCase()} s DPH`, width - 50, y, 11, true, undefined, 'right');

    y -= 20;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // --- VAT Breakdown ---
    y -= 30;
    const vatRate = 0.23;
    const baseAmount = data.amount / (1 + vatRate);
    const vatAmount = data.amount - baseAmount;

    drawText('Základ dane:', width - 200, y, 10, false, DARK_GRAY, 'right');
    drawText(`${baseAmount.toFixed(2)} ${data.currency.toUpperCase()}`, width - 50, y, 10, false, DARK_GRAY, 'right');
    y -= 15;
    drawText('DPH 23%:', width - 200, y, 10, false, DARK_GRAY, 'right');
    drawText(`${vatAmount.toFixed(2)} ${data.currency.toUpperCase()}`, width - 50, y, 10, false, DARK_GRAY, 'right');

    // --- Total ---
    y -= 40;
    const totalBoxY = y;
    // Widen the total box for "s DPH" label
    page.drawRectangle({ x: width - 300, y: totalBoxY - 15, width: 250, height: 40, color: LIGHT_GRAY });

    drawText('CELKOM K UHRADE', width - 290, totalBoxY + 5, 10, true, BRAND_GREEN);
    drawText(`${data.amount.toFixed(2)} ${data.currency.toUpperCase()} s DPH`, width - 60, totalBoxY + 5, 14, true, undefined, 'right');

    // --- Footer ---
    const footerY = 50;
    page.drawLine({ start: { x: 50, y: footerY + 20 }, end: { x: width - 50, y: footerY + 20 }, thickness: 1, color: LIGHT_GRAY });
    drawText('Dakujeme za Vašu dôveru.', width / 2, footerY, 10, false, rgb(0.5, 0.5, 0.5), 'center');
    drawText('Oasis Lounge s.r.o. | www.oasislounge.sk', width / 2, footerY - 15, 9, false, rgb(0.7, 0.7, 0.7), 'center');

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
