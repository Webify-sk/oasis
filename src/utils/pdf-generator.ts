import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Helper to remove accents for StandardFonts compatibility (WinAnsi)
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

    // Embed the Helvetica font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    // Use Times Roman for a more elegant look on the voucher title
    const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Add a blank page to the document - Landscape A5-ish size for voucher
    const page = pdfDoc.addPage([600, 400]);
    const { width, height } = page.getSize();

    // Load Logo
    let logoImage;
    try {
        const fs = await import('fs');
        const path = await import('path');
        const logoPath = path.join(process.cwd(), 'public', 'logo-new.png');
        if (fs.existsSync(logoPath)) {
            const logoBytes = fs.readFileSync(logoPath);
            logoImage = await pdfDoc.embedPng(logoBytes);
        }
    } catch (e) {
        // console.warn('Logo could not be loaded for PDF', e);
    }

    const BRAND_GREEN = rgb(0.37, 0.44, 0.36); // #5E715D
    const LIGHT_BEIGE = rgb(0.99, 0.98, 0.96);
    const GOLD_ACCENT = rgb(0.7, 0.6, 0.4);

    // Background
    page.drawRectangle({
        x: 0, y: 0, width, height,
        color: LIGHT_BEIGE,
    });

    // Elegant Border
    const margin = 20;
    page.drawRectangle({
        x: margin, y: margin,
        width: width - (margin * 2),
        height: height - (margin * 2),
        borderColor: BRAND_GREEN,
        borderWidth: 2,
        color: rgb(1, 1, 1),
    });

    // Inner Thin Border (Double border effect)
    page.drawRectangle({
        x: margin + 5, y: margin + 5,
        width: width - (margin * 2) - 10,
        height: height - (margin * 2) - 10,
        borderColor: GOLD_ACCENT,
        borderWidth: 1,
        color: undefined,
    });

    // --- Header ---
    let y = height - 100; // Start lower for Title by default

    // Logo (Centered at top)
    if (logoImage) {
        const logoHeight = 40;
        const scale = logoHeight / logoImage.height;
        const logoDims = logoImage.scale(scale);

        page.drawImage(logoImage, {
            x: (width - logoDims.width) / 2,
            y: height - margin - logoHeight - 10, // Top of image is at height - 30. Bottom at height - 70.
            width: logoDims.width,
            height: logoDims.height,
        });

        // Push Title down significantly
        y = height - margin - logoHeight - 50;
    } else {
        y = height - 80;
    }

    // Title
    const titleText = 'DARCEKOVY POUKAZ';
    const titleWidth = fontSerif.widthOfTextAtSize(titleText, 28);
    page.drawText(titleText, {
        x: (width - titleWidth) / 2,
        y: y,
        size: 28,
        font: fontSerif,
        color: BRAND_GREEN,
    });


    // Amount / Value
    y -= 50;
    const amountText = `${data.amount} VSTUPOV`;
    const amountWidth = fontBold.widthOfTextAtSize(amountText, 20);
    page.drawText(amountText, {
        x: (width - amountWidth) / 2,
        y: y,
        size: 20,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
    });

    y -= 30;
    // Separator
    page.drawLine({
        start: { x: width / 2 - 50, y },
        end: { x: width / 2 + 50, y },
        thickness: 1,
        color: GOLD_ACCENT,
    });

    // --- Content ---
    y -= 40;

    // Grid layout for details
    const labelX = 100;
    const valueX = 100; // Left align block
    const lineHeight = 25;

    const drawLineItem = (label: string, value: string, yPos: number, isCode = false) => {
        // Label
        // page.drawText(label, { x: labelX, y: yPos, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
        // Value centered
        const text = isCode ? value : `${label}: ${value}`;
        const textSize = isCode ? 18 : 14;
        const textFont = isCode ? fontBold : font;
        const textColor = isCode ? BRAND_GREEN : rgb(0.3, 0.3, 0.3);
        const w = textFont.widthOfTextAtSize(text, textSize);

        page.drawText(removeAccents(text), {
            x: (width - w) / 2,
            y: yPos,
            size: textSize,
            font: textFont,
            color: textColor
        });
    };

    // Sender
    drawLineItem('Daruje', data.sender, y);
    y -= lineHeight;

    // Message
    if (data.message) {
        y -= 10;
        const msg = `"${removeAccents(data.message)}"`;
        const msgWidth = font.widthOfTextAtSize(msg, 12); // Italic simulation not avail in standard fonts easily without embedding, stick to normal
        // Wrap text if too long? For now assume short.
        page.drawText(msg, {
            x: (width - msgWidth) / 2,
            y,
            size: 12,
            font,
            color: rgb(0.4, 0.4, 0.4),
        });
        y -= lineHeight + 10;
    } else {
        y -= 10;
    }

    // Code Box
    y -= 20;
    const boxWidth = 220;
    const boxHeight = 50;
    const boxX = (width - boxWidth) / 2;
    page.drawRectangle({
        x: boxX,
        y: y - 15,
        width: boxWidth,
        height: boxHeight,
        color: rgb(0.97, 0.97, 0.97),
        borderColor: BRAND_GREEN,
        borderWidth: 1,
        // borderDashPhase: 2, // dashed not easily supported in minimal api? checked pdf-lib docs: borderDashArray
        borderDashArray: [5, 5],
    });

    const codeText = removeAccents(data.code);
    const codeWidth = fontBold.widthOfTextAtSize(codeText, 20);
    page.drawText(codeText, {
        x: (width - codeWidth) / 2,
        y: y,
        size: 20,
        font: fontBold,
        color: BRAND_GREEN
    });

    y -= 45;
    page.drawText('KOD POUKAZU', {
        x: (width - font.widthOfTextAtSize('KOD POUKAZU', 8)) / 2,
        y: y,
        size: 8,
        font,
        color: rgb(0.6, 0.6, 0.6)
    });

    // --- Footer ---
    const footerY = 40;
    page.drawText('www.oasislounge.sk', {
        x: width / 2 - fontBold.widthOfTextAtSize('www.oasislounge.sk', 10) / 2,
        y: footerY,
        size: 10,
        font: fontBold,
        color: BRAND_GREEN,
    });

    // Serialize the PDFDocument to bytes (a Uint8Array)
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

    // Load Logo Logic (using fs if simplified layout fails, but imports inside function to avoid web bundle issues)
    let logoImage;
    try {
        const fs = await import('fs');
        const path = await import('path');
        const logoPath = path.join(process.cwd(), 'public', 'logo-new.png');
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
        // Scale logo to fit height of approx 50-60
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
    page.drawRectangle({ x: 50, y: y - 100, width: 240, height: 115, color: LIGHT_GRAY });

    y -= 20;
    drawText('DODAVATEL', 70, y, 10, true, BRAND_GREEN); y -= 20;
    drawText(data.supplierName, 70, y, 11, true); y -= 15;
    data.supplierAddress.split('\n').forEach(line => {
        drawText(line, 70, y, 10); y -= 12;
    });
    y -= 5;
    if (data.supplierIco) { drawText(data.supplierIco, 70, y, 9, false, DARK_GRAY); y -= 12; }

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
    y = topSectionY - 140;
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
    drawText(`${data.amount.toFixed(2)} ${data.currency.toUpperCase()}`, width - 50, y, 11, true, undefined, 'right');

    y -= 20;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // --- Total ---
    y -= 50;
    const totalBoxY = y;
    page.drawRectangle({ x: width - 250, y: totalBoxY - 15, width: 200, height: 40, color: LIGHT_GRAY });

    drawText('CELKOM K UHRADE', width - 240, totalBoxY + 5, 10, true, BRAND_GREEN);
    drawText(`${data.amount.toFixed(2)} ${data.currency.toUpperCase()}`, width - 60, totalBoxY + 5, 14, true, undefined, 'right');

    // --- Footer ---
    const footerY = 50;
    page.drawLine({ start: { x: 50, y: footerY + 20 }, end: { x: width - 50, y: footerY + 20 }, thickness: 1, color: LIGHT_GRAY });
    drawText('Dakujeme za Vašu dôveru.', width / 2, footerY, 10, false, rgb(0.5, 0.5, 0.5), 'center');
    drawText('Oasis Lounge s.r.o. | www.oasislounge.sk', width / 2, footerY - 15, 9, false, rgb(0.7, 0.7, 0.7), 'center');

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
