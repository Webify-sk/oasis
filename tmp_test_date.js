function getRealUtcDate(faceValueDateInput) {
    const faceValueDate = typeof faceValueDateInput === 'string' ? new Date(faceValueDateInput) : faceValueDateInput;

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Bratislava',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    }).formatToParts(faceValueDate);

    const partMap = {};
    parts.forEach(p => partMap[p.type] = p.value);

    const localInUtc = Date.UTC(
        parseInt(partMap.year),
        parseInt(partMap.month) - 1,
        parseInt(partMap.day),
        parseInt(partMap.hour === '24' ? '0' : partMap.hour),
        parseInt(partMap.minute),
        parseInt(partMap.second)
    );

    const offsetMs = localInUtc - faceValueDate.getTime();
    return new Date(faceValueDate.getTime() - offsetMs);
}

function runTest() {
    process.env.TZ = 'UTC'; // simulate vercel
    const input = '2026-03-13T09:00:00';
    console.log('--- Server TZ UTC ---');
    console.log('Input String:', input);

    // Server executing this at UTC
    const serverParsedDate = new Date(input);
    console.log('Server parsed date:', serverParsedDate.toISOString());
    // In UTC, this will be 2026-03-13T09:00:00.000Z

    const realUtc = getRealUtcDate(input);
    console.log('getRealUtcDate:', realUtc.toISOString());

    process.env.TZ = 'Europe/Bratislava'; // simulate localhost
    console.log('\n--- Server TZ Europe/Local ---');
    const localParsedDate = new Date(input);
    console.log('Server parsed date:', localParsedDate.toISOString());
    const realUtcLocal = getRealUtcDate(input);
    console.log('getRealUtcDate:', realUtcLocal.toISOString());
}

runTest();
