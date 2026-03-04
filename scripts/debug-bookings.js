const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('bookings').select('id, start_time, training_type_id').order('start_time', { ascending: false }).limit(20);
    if (error) console.error(error);
    require('fs').writeFileSync('bookings.json', JSON.stringify(data, null, 2));
}
check();
