/**
 * The salon has two treatment rooms, so no more than two procedures can run at the
 * same time regardless of which employee or device they use. Change ROOM_COUNT
 * here if a room is added — every availability check reads it from this file.
 */
export const ROOM_COUNT = 2;

/** Same clean-up gap that applies between an employee's or a device's appointments. */
export const ROOM_BUFFER_MS = 15 * 60 * 1000;

export const ROOM_FULL_MESSAGE =
    'V tomto čase už prebiehajú dve procedúry a obe miestnosti sú obsadené.';

interface TimeRange {
    start_time: string;
    end_time: string;
}

/** Number of appointments overlapping [start, end] once the clean-up buffer is applied. */
export function countRoomsBusy(appointments: TimeRange[] | null | undefined, start: Date, end: Date): number {
    if (!appointments) return 0;
    const from = start.getTime() - ROOM_BUFFER_MS;
    const to = end.getTime() + ROOM_BUFFER_MS;
    return appointments.filter(a => {
        const aStart = new Date(a.start_time).getTime();
        const aEnd = new Date(a.end_time).getTime();
        return from < aEnd && to > aStart;
    }).length;
}

export function roomsAreFull(appointments: TimeRange[] | null | undefined, start: Date, end: Date): boolean {
    return countRoomsBusy(appointments, start, end) >= ROOM_COUNT;
}
