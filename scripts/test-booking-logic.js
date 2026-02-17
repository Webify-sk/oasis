
const { format } = require('util');
const fs = require('fs');

const logFile = 'scripts/test_results.txt';
// Ensure directory exists if needed, but scripts/ should exist.
fs.writeFileSync(logFile, '');

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

function checkBooking(trainingDateIso, nowIso, occupancy) {
    log(`\nTesting: Training at ${trainingDateIso}, Now is ${nowIso}, Occupancy: ${occupancy}`);

    if (occupancy > 0) {
        log("Allowed: Occupancy > 0");
        return true;
    }

    const trainingDateObj = new Date(trainingDateIso);
    const now = new Date(nowIso);

    const formatter = new Intl.DateTimeFormat('sk-SK', {
        timeZone: 'Europe/Bratislava',
        hour: 'numeric',
        hour12: false
    });

    let trainingHour;
    try {
        trainingHour = parseInt(formatter.format(trainingDateObj), 10);
        log(`Training Hour (Bratislava): ${trainingHour}`);
    } catch (e) {
        log(`Error formatting date: ${e.message}`);
        // Fallback or fail
        return false;
    }

    let deadlineHours = 3;

    if (trainingHour <= 11) {
        deadlineHours = 12;
    }

    const deadline = new Date(trainingDateObj.getTime() - (deadlineHours * 60 * 60 * 1000));
    log(`Deadline: ${deadline.toISOString()}`);

    if (now > deadline) {
        log("Blocked: Now > Deadline");
        return false;
    }

    log("Allowed: Now <= Deadline");
    return true;
}

checkBooking('2026-02-18T10:00:00+01:00', '2026-02-17T21:00:00+01:00', 0);
checkBooking('2026-02-18T10:00:00+01:00', '2026-02-17T23:00:00+01:00', 0);
checkBooking('2026-02-18T13:00:00+01:00', '2026-02-18T09:00:00+01:00', 0);
checkBooking('2026-02-18T13:00:00+01:00', '2026-02-18T11:00:00+01:00', 0);
checkBooking('2026-02-18T13:00:00+01:00', '2026-02-18T11:00:00+01:00', 1);
checkBooking('2026-02-18T11:00:00+01:00', '2026-02-17T23:30:00+01:00', 0);
checkBooking('2026-02-18T12:00:00+01:00', '2026-02-18T08:30:00+01:00', 0);
checkBooking('2026-02-18T12:00:00+01:00', '2026-02-18T09:30:00+01:00', 0);
