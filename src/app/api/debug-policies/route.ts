import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use raw query or try to select pg_policies
    const { data: policies, error } = await supabase.from('pg_policies').select('*').eq('tablename', 'bookings');

    return NextResponse.json({ policies, error });
}
