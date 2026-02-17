function getRealUtcDate(faceValueIso) {
    const faceValueDate = new Date(faceValueIso);

    // 1. Get what time "faceValueDate" thinks it is in Bratislava
    // We expect it to be shifted (e.g. 19:00 instead of 18:00)
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Bratislava',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    }).formatToParts(faceValueDate);

    const partMap = {};
    parts.forEach(p => partMap[p.type] = p.value);

    // Construct the "Local Time" value as if it were UTC
    const localInUtc = Date.UTC(
        parseInt(partMap.year),
        parseInt(partMap.month) - 1,
        parseInt(partMap.day),
        parseInt(partMap.hour === '24' ? '0' : partMap.hour), // Intl sometimes returns 24? No, usage of h23/h24. 0-23 usually.
        parseInt(partMap.minute),
        parseInt(partMap.second)
    );

    // Calculate offset: Local - FaceValue
    // e.g. 19:00 - 18:00 = +1h
    const offsetMs = localInUtc - faceValueDate.getTime();

    // The "Real" UTC time for the intended "18:00 Local" is FaceValue - Offset
    // e.g. 18:00 - 1h = 17:00
    // 17:00 UTC in Bratislava is 18:00. Correct.
    return new Date(faceValueDate.getTime() - offsetMs);
}

function test(isoString, nowIso) {
    console.log(`\n--- Test: ${isoString} (Face Value) ---`);

    // OLD LOGIC
    const oldDate = new Date(isoString);
    const oldFormatter = new Intl.DateTimeFormat('sk-SK', { timeZone: 'Europe/Bratislava', hour: 'numeric', hour12: false });
    const oldHour = parseInt(oldFormatter.format(oldDate), 10);
    console.log(`[OLD] Bratislava Hour: ${oldHour} (Expected 18:00 -> 19?)`);

    // NEW LOGIC
    const realDate = getRealUtcDate(isoString);
    console.log(`[NEW] Calculated Real UTC: ${realDate.toISOString()}`);

    const newFormatter = new Intl.DateTimeFormat('sk-SK', { timeZone: 'Europe/Bratislava', hour: 'numeric', hour12: false });
    const newHour = parseInt(newFormatter.format(realDate), 10);
    console.log(`[NEW] Bratislava Hour: ${newHour} (Should be matches input hour, e.g. 18)`);

    // Deadline Logic
    let deadlineHours = 3;
    if (newHour <= 11) {
        deadlineHours = 12;
    }

    const deadline = new Date(realDate.getTime() - (deadlineHours * 60 * 60 * 1000));
    const now = nowIso ? new Date(nowIso) : new Date();

    console.log(`[NEW] Deadline: ${deadline.toISOString()}`);
    console.log(`[NEW] Now: ${now.toISOString()}`);
    console.log(`[NEW] Is Blocked? ${now > deadline}`);
}

// Format: 18:00 Face Value (19:00 Local without fix)
// Actual intended: 18:00 Local
// Real UTC: 17:00
// Test 1: 18:00 Face Value. User checks at 15:30 UTC (16:30 Local)
// Deadline: 17:00 UTC - 3h = 14:00 UTC.
// 15:30 > 14:00. Should be Blocked.

test('2026-02-18T18:00:00Z', '2026-02-18T15:30:00Z');
