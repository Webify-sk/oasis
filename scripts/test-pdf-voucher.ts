import { generateVoucherPDF } from '../src/utils/pdf-generator';
import fs from 'fs';

async function test() {
    console.log('Starting PDF generation test...');
    try {
        const buffer = await generateVoucherPDF({
            code: 'TEST-CODE-ČŠŽÝÁÍÉ', // Test diacritics
            amount: 10,
            sender: 'Janko Hraško',
            message: 'Všetko najlepšie k narodeninám! Nech sa ti darí.'
        });
        console.log('PDF Generated successfully. Length:', buffer.length);
        fs.writeFileSync('test-voucher.pdf', buffer);
        console.log('Saved to test-voucher.pdf');
    } catch (e) {
        console.error('PDF Generation Failed:', e);
    }
}

test();
