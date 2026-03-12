const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { toDate } = require('date-fns-tz');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

function getRealUtcDate(faceValueDateInput) {
    const timeZone = 'Europe/Bratislava';
    const dateStr = typeof faceValueDateInput === 'string'
        ? faceValueDateInput
        : faceValueDateInput.getFullYear() + '-' +
        String(faceValueDateInput.getMonth() + 1).padStart(2, '0') + '-' +
        String(faceValueDateInput.getDate()).padStart(2, '0') + 'T' +
        String(faceValueDateInput.getHours()).padStart(2, '0') + ':' +
        String(faceValueDateInput.getMinutes()).padStart(2, '0');
    return toDate(dateStr, { timeZone });
}

async function debugLeona() {
    // 1. Find Leona's ID
    const { data: employees } = await supabase.from('employees').select('id, name');
    let leonaId = null;
    employees.forEach(e => {
        if (e.name.toLowerCase().includes('leona')) {
            leonaId = e.id;
        }
    });

    console.log(`Leona ID: ${leonaId}`);

    const date = '2026-03-19';
    const searchStart = new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString();
    const searchEnd = new Date(new Date(date).getTime() + 48 * 60 * 60 * 1000).toISOString();

    const { data: appointments } = await supabase
        .from('cosmetic_appointments')
        .select('*')
        .eq('employee_id', leonaId)
        .gte('start_time', searchStart)
        .lte('start_time', searchEnd)
        .filter('status', 'neq', 'cancelled');

    console.log(`Found ${appointments?.length} active appointments for Leona on/around ${date}:`);
    console.log(JSON.stringify(appointments, null, 2));

    // Test the 11:30 slot match
    const duration = 40; // 40 minutes for example
    const slotLocalTimeStr = '11:30';

    const slotStartUTC = getRealUtcDate(`${date}T${slotLocalTimeStr}:00`);
    const slotEndUTC = new Date(slotStartUTC.getTime() + duration * 60000);

    console.log(`\nTesting local slot: ${slotLocalTimeStr}`);
    console.log(`Slot evaluated as  Local Start TS: ${slotStartUTC.getTime()} (${slotStartUTC.toISOString()})`);
    console.log(`Slot evaluated as  Local End   TS: ${slotEndUTC.getTime()}   (${slotEndUTC.toISOString()})`);

    let isCollision = false;
    appointments?.forEach(app => {
        const appStart = new Date(app.start_time);
        const appEnd = new Date(app.end_time);

        console.log(`\n  Comparing with DB Appt: ${app.start_time}`);
        console.log(`  DB Start TS: ${appStart.getTime()} (${appStart.toISOString()})`);
        console.log(`  DB End   TS: ${appEnd.getTime()}   (${appEnd.toISOString()})`);

        if (slotStartUTC < appEnd && slotEndUTC > appStart) {
            console.log('  *** EXACT COLLISION ***');
            isCollision = true;
        } else {
            console.log('  No hit.');
        }
    });
}

debugLeona();
