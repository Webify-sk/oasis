
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    // We can't easily get schema via JS client without admin access or specific query.
    // But we can check a row to see the type of is_active.
    const { data, error } = await supabase.from('cosmetic_services').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Sample Row Keys:', Object.keys(data[0]));
        console.log('is_active value:', data[0].is_active);
        console.log('is_active type:', typeof data[0].is_active);
    } else {
        console.log('No data in cosmetic_services');
    }

    // Also check if we receive data when querying is_active=false
    const { data: inactive, error: inactiveError } = await supabase
        .from('cosmetic_services')
        .select('*')
        .eq('is_active', false);

    console.log('Inactive services found:', inactive?.length);
    if (inactive?.length > 0) {
        console.log('First inactive:', inactive[0].title);
    }
}

checkSchema();
