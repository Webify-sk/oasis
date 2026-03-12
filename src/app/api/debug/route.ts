import { NextResponse } from 'next/server';
import { getAvailableSlots } from '@/actions/cosmetic-actions';
import { getRealUtcDate } from '@/utils/booking-logic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || '1a1b7d3c-6383-4420-bcd5-4bf85c2ae6fd'; // Leona
    const serviceId = searchParams.get('serviceId') || '46aeed62-7d15-4cca-88c3-e563eca46e1b';
    const date = searchParams.get('date') || '2026-03-19';
    const slotLocalTimeStr = "11:30";

    try {
        const slotStartUTC = getRealUtcDate(`${date}T${slotLocalTimeStr}:00`);
        const slotEndUTC = new Date(slotStartUTC.getTime() + 40 * 60000);

        const appointmentsAppStart = new Date("2026-03-19T10:30:00+00:00");
        const appointmentsAppEnd = new Date("2026-03-19T11:10:00+00:00");

        const collision = (slotStartUTC < appointmentsAppEnd && slotEndUTC > appointmentsAppStart);

        // Explicitly test the DB fetch
        const searchStart = new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString();
        const searchEnd = new Date(new Date(date).getTime() + 48 * 60 * 60 * 1000).toISOString();

        const { createClient } = await import('@/utils/supabase/server');
        const supabase = await createClient();
        const { data: dbAppointments } = await supabase
            .from('cosmetic_appointments')
            .select('start_time, end_time, status')
            .eq('employee_id', employeeId)
            .gte('start_time', searchStart)
            .lte('start_time', searchEnd);

        const slots = await getAvailableSlots(employeeId, serviceId, date);
        return NextResponse.json({
            slots,
            dbAppointments,
            diagnostics: {
                slotStartUTC: slotStartUTC.toISOString(),
                slotEndUTC: slotEndUTC.toISOString(),
                appointmentsAppStart: appointmentsAppStart.toISOString(),
                appointmentsAppEnd: appointmentsAppEnd.toISOString(),
                collisionTest: collision
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
