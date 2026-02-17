
const { format } = require('util');

function log(msg) {
    console.log(msg);
}

function checkBooking(trainingDateIso, nowIso) {
    log(`\n--- Debug Check ---`);
    log(`Training ISO: ${trainingDateIso}`);
    log(`Now ISO:      ${nowIso}`);
    const trainingDateObj = new Date(trainingDateIso);
    const now = new Date(nowIso);

    // 1. Check Formatter output
    const formatter = new Intl.DateTimeFormat('sk-SK', {
        timeZone: 'Europe/Bratislava',
        hour: 'numeric',
        hour12: false
    });

    const formatted = formatter.format(trainingDateObj);
    log(`Formatted Hour String: "${formatted}"`);

    const trainingHour = parseInt(formatted, 10);
    log(`Parsed Hour: ${trainingHour}`);

    let deadlineHours = 3;

    if (trainingHour <= 11) {
        deadlineHours = 12;
        log(`Rule: <= 11:00 -> 12h deadline`);
    } else {
        log(`Rule: >= 12:00 -> 3h deadline`);
    }

    const deadline = new Date(trainingDateObj.getTime() - (deadlineHours * 60 * 60 * 1000));
    log(`Calculated Deadline: ${deadline.toISOString()}`);
    log(`Current Time:        ${now.toISOString()}`);

    if (now > deadline) {
        log("RESULT: BLOCKED (Now > Deadline)");
        return false;
    }

    log("RESULT: ALLOWED (Now <= Deadline)");
    return true;
}

// User Case: 
// Current Time approx 11:33
// Training Time 15:30
// Expectation: Allowed (Gap is 4h, Deadline is 3h)

// Note: I will use strict ISO strings with +01:00 to match user environment
const nowString = '2026-02-17T11:33:07+01:00';
const trainingString = '2026-02-17T15:30:00+01:00';

checkBooking(trainingString, nowString);

// Also check 12:30 case (should be blocked)
// Deadline 3h -> 9:30. Now 11:33. Blocked.
checkBooking('2026-02-17T12:30:00+01:00', nowString);
