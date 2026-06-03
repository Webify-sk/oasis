const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProcedures() {
    // get all appointments
    const { data: appointmentsData } = await supabase
        .from('cosmetic_appointments')
        .select('id, employee_id, start_time')
        .neq('status', 'cancelled');

    const { data: employeesData } = await supabase
        .from('employees')
        .select('id, name');

    const employeesMap = new Map(employeesData.map(e => [e.id, e]));

    let missingCount = 0;
    for (const a of appointmentsData) {
        if (!employeesMap.has(a.employee_id)) {
            console.log(`Missing therapist for appointment ${a.id} on ${a.start_time}. Employee ID: ${a.employee_id}`);
            missingCount++;
        }
    }
    console.log(`Total missing: ${missingCount}`);
}

checkProcedures();
