import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();
    const { data: trainers } = await supabase.from('trainers').select('*');
    return NextResponse.json(trainers);
}
