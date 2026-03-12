import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConflictCheck() {
    const employee_id = 'cfd0c0fa-358d-481c-b6ba-6e8975fed73b'; // Sona
    // An existing appointment start and end time based on previous queries
    const start_time = '2026-03-12T16:00:00+00:00';
    const end_time = '2026-03-12T16:45:00+00:00';

    // Admin override overlapping check logic snippet from actions
    const { data: overlappingAppointments, error: conflictError } = await supabase
        .from('cosmetic_appointments')
        .select('id')
        .eq('employee_id', employee_id)
        .lt('start_time', end_time)
        .gt('end_time', start_time)
        .neq('status', 'cancelled');

    console.log('Result:', JSON.stringify({ conflicts: overlappingAppointments, error: conflictError }, null, 2));
}

testConflictCheck();
