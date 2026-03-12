const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpLeona() {
    const { data: employees } = await supabase.from('employees').select('id, name');
    let leonaId = employees.find(e => e.name.toLowerCase().includes('leona'))?.id;
    const date = '2026-03-19';
    const searchStart = new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString();
    const searchEnd = new Date(new Date(date).getTime() + 48 * 60 * 60 * 1000).toISOString();

    const { data: appointments } = await supabase
        .from('cosmetic_appointments')
        .select('*')
        .eq('employee_id', leonaId)
        .gte('start_time', searchStart)
        .lte('start_time', searchEnd);

    fs.writeFileSync('tmp_leona_out.json', JSON.stringify(appointments, null, 2), 'utf8');
}
dumpLeona();
