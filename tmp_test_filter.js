const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Testing .neq():');
    const { data: q1, error: e1 } = await supabase.from('cosmetic_appointments').select('id, status').neq('status', 'cancelled').limit(2);
    console.log('q1:', q1?.length);

    console.log('Testing .filter():');
    try {
        const { data: q2, error: e2 } = await supabase.from('cosmetic_appointments').select('id, status').filter('status', 'neq', 'cancelled').limit(2);
        console.log('q2:', q2?.length, 'error:', e2);
    } catch (err) {
        console.log('filter error:', err.message);
    }
}

main();
