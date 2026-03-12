const fs = require('fs');
const { toDate } = require('date-fns-tz');

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

function testIntersection() {
    const data = JSON.parse(fs.readFileSync('tmp_out.json', 'utf8'));
    const appointments = data.appointments;

    // Test a slot that SHOULD be blocked (e.g. 14.3. o 10:00)
    const date = '2026-03-14';
    const duration = 60; // 60 mins -> ends at 11:00

    // We are generating slots incrementing by 10 mins in getAvailableSlots
    // Let's test the 10:00 local time slot
    let slotLocalTimeStr = '10:00';

    const slotStartUTC = getRealUtcDate(`${date}T${slotLocalTimeStr}:00`);
    const slotEndUTC = new Date(slotStartUTC.getTime() + duration * 60000);

    console.log(`Testing Local Slot: ${date} ${slotLocalTimeStr}`);
    console.log(`Slot UTC Start: ${slotStartUTC.toISOString()} | Timestamp: ${slotStartUTC.getTime()}`);
    console.log(`Slot UTC End:   ${slotEndUTC.toISOString()} | Timestamp: ${slotEndUTC.getTime()}`);

    let isCollision = false;
    appointments.forEach(app => {
        const appStart = new Date(app.start_time);
        const appEnd = new Date(app.end_time);

        console.log(`\n  DB Appt: ${app.start_time} to ${app.end_time}`);
        console.log(`  Parsed : ${appStart.toISOString()} to ${appEnd.toISOString()}`);
        console.log(`  Appt TS: ${appStart.getTime()} to ${appEnd.getTime()}`);

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
