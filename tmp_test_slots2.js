const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const { toDate } = require('date-fns-tz');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAvailability() {
    const employeeId = 'cfd0c0fa-358d-481c-b6ba-6e8975fed73b'; // Sona
    const date = '2026-03-14';

    const searchStart = new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString();
    const searchEnd = new Date(new Date(date).getTime() + 48 * 60 * 60 * 1000).toISOString();

    const { data: appointments, error } = await supabase
        .from('cosmetic_appointments')
        .select('id, start_time, end_time, status')
        .eq('employee_id', employeeId)
        .gte('start_time', searchStart)
        .lte('start_time', searchEnd)
        .filter('status', 'neq', 'cancelled');

    fs.writeFileSync('tmp_out.json', JSON.stringify({ appointments, error }, null, 2));
}

testAvailability();
