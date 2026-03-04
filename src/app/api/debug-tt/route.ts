import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();
    const { data: tt } = await supabase.from('training_types').select('id, title, schedule');
    return NextResponse.json(tt);
}
