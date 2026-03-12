const fs = require('fs');
const { toDate } = require('date-fns-tz');

function testIntersection() {
    const data = JSON.parse(fs.readFileSync('tmp_out.json', 'utf8'));
    const appointments = data.appointments;

    // Test a slot that SHOULD be blocked (e.g. 14.3. o 10:00)
    const date = '2026-03-14';
    const duration = 60; // ends at 11:00

    let slotLocalTimeStr = '10:00';

    // New logic used in actions
    const slotStartUTC = new Date(`${date}T${slotLocalTimeStr}:00.000Z`);
    const slotEndUTC = new Date(slotStartUTC.getTime() + duration * 60000);

    console.log(`Testing Local Slot: ${date} ${slotLocalTimeStr}`);
    console.log(`Slot UTC Start: ${slotStartUTC.toISOString()}`);
    console.log(`Slot UTC End:   ${slotEndUTC.toISOString()}`);

    let isCollision = false;
    appointments.forEach(app => {
        const appStart = new Date(app.start_time);
        const appEnd = new Date(app.end_time);

        console.log(`\n  DB Appt: ${app.start_time} to ${app.end_time}`);

        // This is the EXACT logic from getAvailableSlots
        if (slotStartUTC < appEnd && slotEndUTC > appStart) {
            console.log('  *** COLLISION MATCH ***');
            isCollision = true;
        } else {
            console.log('  No match');
        }
    });

    console.log('\nFinal isCollision:', isCollision);
}

testIntersection();
