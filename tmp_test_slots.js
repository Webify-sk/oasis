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

async function testAvailability() {
    const employeeId = 'cfd0c0fa-358d-481c-b6ba-6e8975fed73b'; // Sona
    const date = '2026-03-14';

    console.log(`Testing filtering logic for date: ${date}`);

    // Mimic the query in getAvailableSlots
    const searchStart = new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString();
    const searchEnd = new Date(new Date(date).getTime() + 48 * 60 * 60 * 1000).toISOString();

    console.log(`Search range bounds: ${searchStart} to ${searchEnd}`);

    const { data: appointments } = await supabase
        .from('cosmetic_appointments')
        .select('id, start_time, end_time, status')
        .eq('employee_id', employeeId)
        .gte('start_time', searchStart)
        .lte('start_time', searchEnd); // NO eq filter here since we test that separately.

    // Filter manually as .neq is not used in the user's codebase, .filter() is.
    const activeAppointments = appointments.filter(a => a.status !== 'cancelled');

    console.log(`Found ${activeAppointments.length} active appointments in range:`, activeAppointments);

    // Let's test a slot that we know conflicts, e.g. 10:00 on 14th
    const slotLocalTimeStr = '10:00';
    const duration = 60; // assume 60 min

    const slotStartUTC = getRealUtcDate(`${date}T${slotLocalTimeStr}:00`);
    const slotEndUTC = new Date(slotStartUTC.getTime() + duration * 60000);

    console.log(`\nTesting local slot ${slotLocalTimeStr} for ${date}`);
    console.log(`=> slotStartUTC computed: ${slotStartUTC.toISOString()}`);
    console.log(`=> slotEndUTC computed  : ${slotEndUTC.toISOString()}`);

    let hadCollision = false;
    activeAppointments.forEach(app => {
        const appStart = new Date(app.start_time);
        const appEnd = new Date(app.end_time);
        console.log(`\n  Checking against Appt: ${appStart.toISOString()} -> ${appEnd.toISOString()}`);

        const collides = (slotStartUTC < appEnd && slotEndUTC > appStart);
        if (collides) {
            hadCollision = true;
            console.log(`  >>> COLLISION DETECTED! <<<`);
        } else {
            console.log(`  No collision.`);
        }
    });

    console.log('\nFinal Decision: Is Slot Avaliable?', !hadCollision);
}

testAvailability();
