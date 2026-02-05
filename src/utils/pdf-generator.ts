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

    // Add a blank page to the document
    const page = pdfDoc.addPage([600, 400]);
    const { width, height } = page.getSize();

    // Background color (Soft beige/white)
    page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(0.99, 0.98, 0.96),
    });

    // Border
    page.drawRectangle({
        x: 20,
        y: 20,
        width: width - 40,
        height: height - 40,
        borderColor: rgb(0.37, 0.44, 0.36), // #5E715D
        borderWidth: 2,
        color: rgb(1, 1, 1), // White inner
    });

    // Title
    page.drawText('DARCEKOVY POUKAZ', {
        x: width / 2 - 110,
        y: height - 80,
        size: 24,
        font: fontBold,
        color: rgb(0.37, 0.44, 0.36),
    });

    // Amount
    page.drawText(`${data.amount} VSTUPOV`, {
        x: width / 2 - 60,
        y: height - 120,
        size: 18,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
    });

    // Code Box
    page.drawRectangle({
        x: width / 2 - 100,
        y: height / 2 - 20,
        width: 200,
        height: 60,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
    });

    page.drawText(removeAccents(data.code), {
        x: width / 2 - 55, // Approximate centering
        y: height / 2 + 5,
        size: 20,
        font: fontBold,
        color: rgb(0, 0, 0),
    });

    // Details
    let yPos = 140;
    page.drawText(`Od: ${removeAccents(data.sender)}`, {
        x: 50,
        y: yPos,
        size: 14,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
    });

    if (data.message) {
        yPos -= 30;
        page.drawText(`Sprava: "${removeAccents(data.message)}"`, {
            x: 50,
            y: yPos,
            size: 12,
            font: font,
            color: rgb(0.5, 0.5, 0.5),
        });
    }

    // Footer
    page.drawText('Oasis Lounge', {
        x: width / 2 - 40,
        y: 40,
        size: 12,
        font: fontBold,
        color: rgb(0.37, 0.44, 0.36),
    });

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
