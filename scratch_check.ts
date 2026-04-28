import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            participants_count,
            user_id,
            profiles(id, full_name, email, role)
        `)
        .order('start_time', { ascending: false })
        .limit(200);
        
    if (error) {
        console.error("Error", error);
        return;
    }
    
    console.log("Total bookings checked:", bookings.length);
    const largeBookings = bookings.filter(b => b.participants_count >= 5);
    console.log("Large bookings (>5 participants):", largeBookings.map(b => ({
        pc: b.participants_count,
        name: b.profiles?.full_name,
        role: b.profiles?.role,
        email: b.profiles?.email
    })));
}

check();
