const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPaulina() {
    const { data: profiles } = await supabase.from('profiles').select('id, credits, credits_expire_at').ilike('email', '%paulibednars@gmail.com%');
    const userId = profiles[0].id;
    console.log("Profile:", profiles[0]);

    const { data: batches } = await supabase.from('credit_batches').select('*').eq('user_id', userId).order('created_at');
    console.log("Batches:", batches);

    const { data: bookings } = await supabase.from('bookings').select('*, training_types(title, price_credits)').eq('user_id', userId).order('created_at');
    console.log("Bookings:", bookings);

    const { data: deductions } = await supabase.from('booking_deductions').select('*, bookings(*)').in('batch_id', batches.map(b => b.id));
    console.log("Deductions:", deductions);
}

checkPaulina();
