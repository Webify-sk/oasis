const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookingsSchema() {
    const { data: bookings } = await supabase.from('bookings').select('*').limit(1);
    console.log(Object.keys(bookings[0]));
}

checkBookingsSchema();
