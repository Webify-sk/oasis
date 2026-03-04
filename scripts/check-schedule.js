const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('training_types').select('id, title, schedule');
    if (error) console.error(error);
    console.dir(data, { depth: null });

    const { data: trainers } = await supabase.from('trainers').select('id, full_name, profile_id');
    console.dir(trainers, { depth: null });
}
check();
