const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPaulina() {
    console.log("Checking Paulina...");
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', '%paulibednars@gmail.com%');
    
    if (error) {
        console.error("Error fetching profile:", error);
        return;
    }

    if (profiles && profiles.length > 0) {
        const userId = profiles[0].id;
        console.log("User ID:", userId);
        
        // Fetch credit_batches
        const { data: batches, error: batchesError } = await supabase
            .from('credit_batches')
            .select('*')
            .eq('user_id', userId);
            
        if (batchesError) {
            console.error("Error fetching batches:", batchesError);
        } else {
            console.log("Batches:");
            console.dir(batches, { depth: null });
        }

        // Check if there are other relevant tables like bookings
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('*, appointments(*)')
            .eq('user_id', userId);
        
        if (bookingsError) {
             console.error("Error fetching bookings:", bookingsError);
        } else {
             console.log("Bookings:");
             console.dir(bookings, { depth: null });
        }
    }
}

checkPaulina();
