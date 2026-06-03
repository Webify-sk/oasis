const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateMichaela() {
    const { data: profiles } = await supabase.from('profiles').select('id, credits, credits_expire_at').eq('email', 'michaela.zajacovaa@gmail.com');
    if (!profiles || profiles.length === 0) return;
    const userId = profiles[0].id;

    console.log("Profile credits:", profiles[0].credits);

    const { data: batches } = await supabase.from('credit_batches').select('*').eq('user_id', userId).order('created_at');
    console.log("Batches:");
    console.table(batches);

    const { data: deductions } = await supabase.from('booking_deductions').select('amount').in('batch_id', batches.map(b => b.id));
    const totalDeducted = deductions.reduce((acc, d) => acc + Number(d.amount), 0);
    console.log("Total Deducted from batches:", totalDeducted);
    
    // Also let's check bookings count
    const { data: bookings } = await supabase.from('bookings').select('id').eq('user_id', userId);
    console.log("Total Bookings:", bookings ? bookings.length : 0);
}

investigateMichaela();
