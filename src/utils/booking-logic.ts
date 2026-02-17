
export function getRealUtcDate(faceValueDateInput: Date | string): Date {
    const faceValueDate = typeof faceValueDateInput === 'string' ? new Date(faceValueDateInput) : faceValueDateInput;

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Bratislava',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    }).formatToParts(faceValueDate);

    const partMap: Record<string, string> = {};
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

export function isBookingLocked(startTimeISO: string | Date): { isLocked: boolean; deadlineMsg: string } {
    const realDate = getRealUtcDate(startTimeISO);

    const formatter = new Intl.DateTimeFormat('sk-SK', {
        timeZone: 'Europe/Bratislava',
        hour: 'numeric',
        hour12: false
    });

    const trainingHour = parseInt(formatter.format(realDate), 10);
    let deadlineHours = 3;

    if (trainingHour <= 11) {
        deadlineHours = 12;
    }

    const deadline = new Date(realDate.getTime() - (deadlineHours * 60 * 60 * 1000));
    const now = new Date();

    return {
        isLocked: now > deadline,
        deadlineMsg: trainingHour <= 11 ? '12 hodín' : '3 hodiny'
    };
}
