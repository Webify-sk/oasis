const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminInvoiceUpdate() {
    const { data: invoices, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .limit(1);

    const testInvoice = invoices[0];
    const updatePayload = {
        description: testInvoice.description,
        amount: testInvoice.amount,
        created_at: testInvoice.created_at,
        status: testInvoice.status,
        variable_symbol: testInvoice.variable_symbol,
        billing_name: testInvoice.billing_name,
        billing_street: testInvoice.billing_street,
        billing_city: testInvoice.billing_city,
        billing_zip: testInvoice.billing_zip,
        billing_country: testInvoice.billing_country,
        company_name: "Tested Company S.R.O. " + Date.now(),
        company_ico: "987654321",
        company_dic: "1234567890",
        company_ic_dph: "SK1234567890",
        discount_amount: testInvoice.discount_amount,
        service_type: testInvoice.service_type
    };

    Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
            delete updatePayload[key];
        }
    });

    const { data: updatedData, error: updateError } = await supabase
        .from('invoices')
        .update(updatePayload)
        .eq('id', testInvoice.id)
        .select('*');

    fs.writeFileSync('tmp_out_invoice.json', JSON.stringify({ error: updateError, data: updatedData }, null, 2));
}

testAdminInvoiceUpdate();
