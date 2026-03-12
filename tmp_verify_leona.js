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

// Emulate user clicking 11:30 for a service of length Duration
const date = '2026-03-19';
const slotLocalTimeStr = '11:30';
const durationMinutes = 40; // e.g. service length

const slotStartUTC = getRealUtcDate(`${date}T${slotLocalTimeStr}:00`);
const slotEndUTC = new Date(slotStartUTC.getTime() + durationMinutes * 60000);

console.log(`Slot Start UTC evaluated as: ${slotStartUTC.toISOString()} | TS: ${slotStartUTC.getTime()}`);
console.log(`Slot End   UTC evaluated as:   ${slotEndUTC.toISOString()} | TS: ${slotEndUTC.getTime()}`);

// Database times (10:30 to 11:10 UTC means 11:30 to 12:10 local)
const appStart = new Date("2026-03-19T10:30:00+00:00");
const appEnd = new Date("2026-03-19T11:10:00+00:00");

console.log(`\nDB Appt Start: ${appStart.toISOString()} | TS: ${appStart.getTime()}`);
console.log(`DB Appt End  :   ${appEnd.toISOString()} | TS: ${appEnd.getTime()}`);

console.log(`\nCollision Logic: slotStartUTC < appEnd && slotEndUTC > appStart`);
console.log(`(${slotStartUTC.getTime()} < ${appEnd.getTime()}) && (${slotEndUTC.getTime()} > ${appStart.getTime()})`);
console.log(`Result: ${(slotStartUTC < appEnd && slotEndUTC > appStart)}`);
