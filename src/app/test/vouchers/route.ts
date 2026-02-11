import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();
    const { data } = await supabase.from('voucher_products').select('title, category').eq('is_active', true);
    return NextResponse.json(data);
}
