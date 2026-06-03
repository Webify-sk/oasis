import { createClient } from '@/utils/supabase/server';
import { requireEmployeeOrAdmin } from '@/utils/check-role';
import AdminBookingsManager from '@/components/admin/trainings/AdminBookingsManager';

export default async function AdminBookingsPage() {
    await requireEmployeeOrAdmin();
    const supabase = await createClient();

    // 1. Fetch upcoming bookings
    const { data: bookingsRaw } = await supabase
        .from('bookings')
        .select(`
            id,
            start_time,
            participants_count,
            training_type:training_types (
                id,
                title,
                level
            ),
            user:profiles!bookings_user_id_fkey (
                id,
                full_name,
                email,
                phone
            )
        `)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

    const bookings = (bookingsRaw as any) || [];

    // 2. Fetch data for schedule generation (for Reschedule Modal)
    const { data: trainingTypes } = await supabase.from('training_types').select('*');
    const { data: trainers } = await supabase.from('trainers').select('id, full_name');
    const trainersMap = new Map(trainers?.map(t => [t.id, t.full_name]) || []);

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const daysToShow = 7; // Show next 7 days in reschedule dropdown
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysToShow - 1);
    endDate.setHours(23, 59, 59, 999);

    const { data: allSlotBookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

    const { data: exceptions } = await supabase
        .from('training_session_exceptions')
        .select('*')
        .in('training_type_id', trainingTypes?.map(t => t.id) || [])
        .gte('session_start_time', startDate.toISOString())
        .lte('session_start_time', endDate.toISOString());

    const { data: vacations } = await supabase
        .from('vacations')
        .select('*')
        .lte('start_time', endDate.toISOString())
        .gte('end_time', startDate.toISOString());

    const weekDates = [];
    const dayNames = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];
    for (let i = 0; i < daysToShow; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dayOfWeek = d.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekDates.push({
            dateObj: d,
            dayName: dayNames[dayIndex],
            formattedDate: `${dayNames[dayIndex]}, ${d.getDate()}. ${d.toLocaleString('sk-SK', { month: 'long' })}`
        });
    }

    const scheduleData = weekDates.map(wd => {
        const sessionsForDay: any[] = [];

        trainingTypes?.forEach(tt => {
            if (Array.isArray(tt.schedule)) {
                const terms = tt.schedule.filter((term: any) => {
                    if (term.active === false) return false;
                    if (term.isRecurring !== false) return term.day === wd.dayName;
                    if (term.date) {
                        const termDate = new Date(term.date);
                        return termDate.toDateString() === wd.dateObj.toDateString();
                    }
                    return false;
                });

                terms.forEach((term: any) => {
                    let timeStr = term.time;
                    if (timeStr.includes('-')) timeStr = timeStr.split('-')[0].trim();
                    if (!timeStr || !timeStr.includes(':')) return;

                    const [hours, minutes] = timeStr.split(':').map(Number);
                    if (isNaN(hours) || isNaN(minutes)) return;

                    const sessionStartTimestamp = Date.UTC(wd.dateObj.getFullYear(), wd.dateObj.getMonth(), wd.dateObj.getDate(), hours, minutes, 0, 0);
                    
                    const now = new Date();
                    const bratislavaTimeStr = now.toLocaleString('en-US', { timeZone: 'Europe/Bratislava', hour12: false });
                    const bratislavaDate = new Date(bratislavaTimeStr);
                    const nowFaceValue = Date.UTC(
                        bratislavaDate.getFullYear(), bratislavaDate.getMonth(), bratislavaDate.getDate(),
                        bratislavaDate.getHours(), bratislavaDate.getMinutes(), bratislavaDate.getSeconds()
                    );

                    const isPast = sessionStartTimestamp < nowFaceValue;
                    if (isPast) return;

                    const sessionStartISO = new Date(sessionStartTimestamp).toISOString();

                    const exception = exceptions?.find((e: any) => {
                        const dbTime = new Date(e.session_start_time).getTime();
                        const sessionTime = new Date(sessionStartISO).getTime();
                        return e.training_type_id === tt.id && Math.abs(dbTime - sessionTime) < 1000;
                    });
                    const isIndividual = exception?.is_individual || false;

                    const isVacation = vacations?.some((v: any) => {
                        const vStart = new Date(v.start_time).getTime();
                        const vEnd = new Date(v.end_time).getTime();
                        const sessionTime = new Date(sessionStartISO).getTime();
                        const isOverlapping = sessionTime >= vStart && sessionTime < vEnd;
                        if (isOverlapping) {
                            if (!v.trainer_id) return true;
                            if (v.trainer_id === term.trainer_id) return true;
                        }
                        return false;
                    });

                    const slotBookings = allSlotBookings?.filter((b: any) => {
                        const bDate = new Date(b.start_time);
                        return b.training_type_id === tt.id && Math.abs(bDate.getTime() - sessionStartTimestamp) < 60000;
                    }) || [];

                    const currentOccupancy = slotBookings.reduce((sum: number, b: any) => sum + (b.participants_count || 1), 0);

                    sessionsForDay.push({
                        id: `${tt.id}-${term.id}-${wd.dateObj.getDate()}`,
                        trainingTypeId: tt.id,
                        startTimeISO: sessionStartISO,
                        time: term.time,
                        name: tt.title,
                        trainer: trainersMap.get(term.trainer_id) || 'Neznámy tréner',
                        occupancy: {
                            current: isVacation ? (tt.capacity || 10) : currentOccupancy,
                            max: tt.capacity || 10
                        },
                        isPast,
                        isIndividual
                    });
                });
            }
        });

        sessionsForDay.sort((a, b) => a.time.localeCompare(b.time));

        return {
            date: wd.formattedDate,
            sessions: sessionsForDay
        };
    }).filter(day => day.sessions.length > 0);

    return (
        <div style={{ padding: '0rem', width: '100%', minWidth: 0 }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '1.5rem 1rem 0 1rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", display: 'flex', alignItems: 'center', gap: '1rem', color: '#93745F' }}>
                    Rezervácie Tréningov
                    <span style={{ fontSize: '1.2rem', backgroundColor: '#f3f4f6', padding: '0.2rem 0.8rem', borderRadius: '999px', color: '#6b7280', fontFamily: 'var(--font-geist-sans)' }}>
                        {bookings.length}
                    </span>
                </h1>
            </div>

            <AdminBookingsManager
                initialBookings={bookings}
                scheduleData={scheduleData}
            />
        </div>
    );
}
