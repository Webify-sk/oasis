
const { generateVoucherPDF } = require('./src/utils/pdf-generator');
const fs = require('fs');

async function test() {
    console.log('Starting PDF generation test...');
    try {
        const buffer = await generateVoucherPDF({
            code: 'TEST-CODE',
            amount: 10,
            sender: 'Test Sender',
            message: 'Test Message'
        });
        console.log('PDF Generated successfully. Length:', buffer.length);
        fs.writeFileSync('test-voucher.pdf', buffer);
        console.log('Saved to test-voucher.pdf');
    } catch (e) {
        console.error('PDF Generation Failed:', e);
    }
}

test();
