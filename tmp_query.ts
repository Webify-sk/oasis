import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: employees } = await supabase.from('employees').select('id, name');

    const sona = employees?.find(e => e.name.toLowerCase().includes('soňa') || e.name.toLowerCase().includes('sona'));
    if (!sona) {
        fs.writeFileSync('tmp_out.json', JSON.stringify({ error: 'Soňa not found' }));
        return;
    }

    const { data: appointments, error } = await supabase
        .from('cosmetic_appointments')
        .select('id, start_time, end_time, status, service_id, client_name')
        .eq('employee_id', sona.id)
        .order('start_time', { ascending: false })
        .limit(20);

    if (error) {
        fs.writeFileSync('tmp_out.json', JSON.stringify({ error: error }));
    } else {
        fs.writeFileSync('tmp_out.json', JSON.stringify({ sona, appointments }, null, 2));
    }
}

main().catch(err => {
    fs.writeFileSync('tmp_out.json', JSON.stringify({ error: err.message }));
});
