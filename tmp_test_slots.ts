import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getRealUtcDate } from './src/utils/booking-logic'

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAvailability() {
    const employeeId = 'cfd0c0fa-358d-481c-b6ba-6e8975fed73b'; // Sona
    const serviceId = '46aeed62-7d15-4cca-88c3-e563eca46e1b'; // Any valid service id for 13th
    const date = '2026-03-13'; // She has a confirmed appt at 10:00

    // Manually running getAvailableSlots logic
    const { data: appointments } = await supabase
        .from('cosmetic_appointments')
        .select('start_time, end_time')
        .eq('employee_id', employeeId)
        .gte('start_time', '2026-03-12T00:00:00.000Z')
        .lte('start_time', '2026-03-14T23:59:59.000Z')
        .neq('status', 'cancelled');

    console.log('Existing Appointments:', appointments);

    const slotLocalTimeStr = '10:00';
    const duration = 60; // assume 60 min

    const slotStartUTC = getRealUtcDate(`${date}T${slotLocalTimeStr}:00`);
    const slotEndUTC = new Date(slotStartUTC.getTime() + duration * 60000);

    console.log(`Slot we are testing locally: ${slotLocalTimeStr}`);
    console.log(`Slot computed UTC start: ${slotStartUTC.toISOString()}`);
    console.log(`Slot computed UTC end: ${slotEndUTC.toISOString()}`);

    const isCollision = appointments?.some(app => {
        const appStart = new Date(app.start_time);
        const appEnd = new Date(app.end_time);
        const collides = (slotStartUTC < appEnd && slotEndUTC > appStart);
        if (collides) {
            console.log(`COLLISION DETECTED with: ${appStart.toISOString()} - ${appEnd.toISOString()}`);
        }
        return collides;
    });

    console.log('Is Collision:', isCollision);
}

testAvailability();
