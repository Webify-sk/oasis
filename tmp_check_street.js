const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInvoices() {
    console.log("TESTING INVOICES SCHEMA");
    const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select(`id, billing_street, billing_address`)
        .limit(1);

    if (invError) {
        console.error("ERROR: ", invError.message);
    } else {
        console.log("SUCCESS");
        console.log("Sample:", invData);
    }
}

testInvoices();
