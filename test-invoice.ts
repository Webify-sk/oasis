
import { generateInvoicePDF } from './src/utils/pdf-generator';
import fs from 'fs';
import path from 'path';

// Mocking COMPANY_DETAILS 
const COMPANY_DETAILS = {
    name: 'Oasis Lounge s.r.o.',
    address: 'Vajnorská 100/A\n831 04 Bratislava',
    ico: '12 345 678',
    dic: '2021234567',
    icdph: 'SK2021234567',
    email: 'info@oasis-lounge.sk',
    phone: '+421 900 000 000',
    web: 'www.oasislounge.sk'
};

async function testInvoice() {
    console.log('Starting Invoice PDF generation test...');
    try {
        const buffer = await generateInvoicePDF({
            invoiceNumber: 'W20260001',
            date: new Date().toLocaleDateString('sk-SK'),
            amount: 27.00,
            currency: 'eur',
            description: 'Nákup: Oasis Intro Pass',
            buyerName: 'Janko Hraško',
            buyerAddress: 'Hlavná 1, 040 01 Košice',
            supplierName: COMPANY_DETAILS.name,
            supplierAddress: COMPANY_DETAILS.address,
            supplierIco: COMPANY_DETAILS.ico,
            supplierDic: COMPANY_DETAILS.dic,
            supplierIcdph: COMPANY_DETAILS.icdph,
            variableSymbol: '20260001'
        });
        console.log('Invoice PDF Generated successfully. Length:', buffer.length);
        fs.writeFileSync('test-invoice.pdf', buffer);
        console.log('Saved to test-invoice.pdf');
    } catch (e) {
        console.error('Invoice PDF Generation Failed:', e);
    }
}

testInvoice();
