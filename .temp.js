require('dotenv').config({ path: '.env.development' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*, user:profiles(full_name, phone, email)');

        if (error) console.error('Error fetching bookings:', error);
        else console.log('Bookings in DB:', JSON.stringify(bookings, null, 2));

        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'trainer');

        if (pError) console.error('Error fetching profiles:', pError);
        else console.log('Trainer profiles:', JSON.stringify(profiles, null, 2));

    } catch (err) {
        console.error(err);
    }
}

run();
