const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInvoices() {
    console.log("TESTING INVOICES SCHEMA");
    const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select(`id, company_name, company_ico, company_dic, company_ic_dph`)
        .limit(1);

    if (invError) {
        console.error("ERROR: Columns missing in invoices table!", invError.message);
    } else {
        console.log("SUCCESS: Columns exist in invoices table.");
        console.log("Sample:", invData);
    }
}

testInvoices();
