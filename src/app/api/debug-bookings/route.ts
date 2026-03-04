import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: b, error } = await supabase.from('bookings').select('id, start_time, training_type_id, user:profiles(full_name)').order('start_time', { ascending: false }).limit(20);
    if (error) return NextResponse.json({ error });
    return NextResponse.json(b);
}
