const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://smdcavzkbtokfrckwqoe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZGNhdnprYnRva2ZyY2t3cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2ODkzMDgsImV4cCI6MjA4NTI2NTMwOH0.6b_mbBxyjMaplSOOkgXT98jyqJ4PSdn7sVslqnfI0ME';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVouchers() {
    const { data, error } = await supabase
        .from('voucher_products')
        .select('*')
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching vouchers:', error);
    } else {
        console.log(`Found ${data.length} active vouchers.`);
        console.log(data);
    }
}

checkVouchers();
