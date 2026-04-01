const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
    // 1. Fetch any profile
    const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id, company_name, company_ico')
        .limit(1);

    if (fetchError || !profiles || profiles.length === 0) {
        console.error("Fetch error:", fetchError);
        return;
    }

    const testId = profiles[0].id;
    console.log("Testing update on profile:", testId);

    // 2. Try upsert with company_name
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            id: testId,
            company_name: "Test s.r.o. " + Date.now(),
            company_ico: "12345678"
        });

    if (error) {
        console.error("Upsert error:", error);
    } else {
        console.log("Upsert success:", data);
        
        // 3. Try to fetch again to verify
        const { data: updatedProfile } = await supabase
            .from('profiles')
            .select('company_name, company_ico')
            .eq('id', testId)
            .single();
            
        console.log("Verified in DB:", updatedProfile);
    }

    // 4. Also check invoices table columns!
    console.log("\nChecking invoices table schema...");
    const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select('company_name, company_ico')
        .limit(1);

    if (invError) {
        console.error("Invoices schema error:", invError);
    } else {
        console.log("Invoices columns exist!", invData);
    }
}

testUpdate();
