import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient();

    // As a normal signed-in trainer:
    await supabase.auth.signInWithPassword({ email: 'vikikozena@gmail.com', password: 'password' });

    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
            id,
            start_time,
            participants_count,
            training_type_id,
            user_id,
            user:profiles(full_name, phone, email)
        `)
        .limit(10);

    return NextResponse.json({ bookings });
}
