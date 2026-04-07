
import { toZonedTime, toDate, formatInTimeZone } from 'date-fns-tz';

export function getRealUtcDate(faceValueDateInput: Date | string): Date {
    // Takes something like "2026-03-13T09:00" and ensures we treat it as Europe/Bratislava time.
    // If a Date object is passed, we format it back to local string to strip browser/server offsets
    let dateStr = typeof faceValueDateInput === 'string'
        ? faceValueDateInput
        : faceValueDateInput.getFullYear() + '-' +
        String(faceValueDateInput.getMonth() + 1).padStart(2, '0') + '-' +
        String(faceValueDateInput.getDate()).padStart(2, '0') + 'T' +
        String(faceValueDateInput.getHours()).padStart(2, '0') + ':' +
        String(faceValueDateInput.getMinutes()).padStart(2, '0');

    if (typeof dateStr === 'string') {
        const match = dateStr.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?)/);
        if (match) {
            dateStr = match[1];
        }
    }

    // toDate from date-fns-tz parses a string considering the provided default time zone
    const timeZone = 'Europe/Bratislava';
    const utcDate = toDate(dateStr, { timeZone });
    return utcDate;
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
