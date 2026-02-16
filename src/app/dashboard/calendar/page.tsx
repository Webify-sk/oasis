import { createClient } from '@/utils/supabase/server';
import { MonthlyCalendar } from '@/components/dashboard/MonthlyCalendar';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CalendarPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const params = await searchParams;
    const dateParam = typeof params.date === 'string' ? params.date : undefined;

    const today = new Date();
    // Use queried date or today
    const currentDate = dateParam ? new Date(dateParam) : today;

    // Ensure valid date
    if (isNaN(currentDate.getTime())) {
        // Fallback if invalid
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 1. Fetch Training Types
    const { data: trainingTypes } = await supabase
        .from('training_types')
        .select('*');

    // 2. Fetch Trainers
    const { data: trainers } = await supabase
        .from('trainers')
        .select('id, full_name');
    const trainersMap = new Map(trainers?.map(t => [t.id, t.full_name]) || []);

    // 3. Fetch Bookings for the Month (for occupancy & user status)
    const { data: { user } } = await supabase.auth.getUser();

    // Use UTC for consistent querying regardless of server timezone
    const startDate = new Date(Date.UTC(year, month, 1)).toISOString();
    const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();

    const { data: monthBookings } = await supabase
        .from('bookings')
        .select('training_type_id, start_time, user_id')
        .gte('start_time', startDate)
        .lte('start_time', endDate);

    // 3b. Fetch Exceptions for the month
    const { data: exceptions } = await supabase
        .from('training_session_exceptions')
        .select('*')
        .in('training_type_id', trainingTypes?.map(t => t.id) || [])
        .gte('session_start_time', startDate)
        .lte('session_start_time', endDate);

    // 3c. Fetch Vacations for the month
    const { data: vacations } = await supabase
        .from('vacations')
        .select('*')
        .lte('start_time', endDate)
        .gte('end_time', startDate);

    const allBookings = monthBookings || [];
    const userBookings = user ? allBookings.filter((b: any) => b.user_id === user.id) : [];

    // 4. Generate Events for the Month
    const events: any[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dayName = dayNames[dateObj.getDay()];

        trainingTypes?.forEach(tt => {
            if (Array.isArray(tt.schedule)) {
                // Find matching day terms
                const terms = tt.schedule.filter((term: any) => {
                    if (term.active === false) return false;

                    // Recurring Logic
                    if (term.isRecurring !== false) {
                        return term.day === dayName;
                    }

                    // One-time Date Logic
                    if (term.date) {
                        const termDate = new Date(term.date);
                        // Compare YYYY-MM-DD
                        return termDate.toDateString() === dateObj.toDateString();
                    }

                    return false;
                });

                terms.forEach((term: any) => {
                    // Calculate exact start time for matching
                    let timeStr = term.time;
                    if (timeStr.includes('-')) timeStr = timeStr.split('-')[0].trim();
                    const [hours, minutes] = timeStr.split(':').map(Number);

                    // IMPORTANT: Construct Date in UTC to match DB "Face Value" storage
                    // The DB stores "08:30" as "08:30 UTC"
                    const sessionStartTimestamp = Date.UTC(year, month, day, hours, minutes, 0, 0);

                    // Check if user has a booking for this type at this time
                    // ISO string comparison might be tricky due to timezones, so we compare timestamps or close enough
                    // Ideally database stores UTC. detailed comparison:
                    // Check for VACATIONS
                    const isVacation = vacations?.some((v: any) => {
                        const vStart = new Date(v.start_time).getTime();
                        const vEnd = new Date(v.end_time).getTime();
                        // sessionStartTimestamp is already UTC timestamp constructed from Face Value
                        return sessionStartTimestamp >= vStart && sessionStartTimestamp < vEnd;
                    });

                    const maxOccupancy = tt.capacity || 10;

                    const bookedCount = allBookings.filter((b: any) => {
                        const bDate = new Date(b.start_time);
                        return b.training_type_id === tt.id && Math.abs(bDate.getTime() - sessionStartTimestamp) < 60000;
                    }).length;

                    const currentOccupancy = isVacation ? maxOccupancy : bookedCount;

                    const isRegistered = userBookings.some((b: any) => {
                        const bDate = new Date(b.start_time);
                        return b.training_type_id === tt.id && Math.abs(bDate.getTime() - sessionStartTimestamp) < 60000;
                    });

                    // Check for exception (Individual)
                    // Construct ISO string for comparison logic if needed, or use timestamp
                    // Exceptions in DB are timestamptz.
                    const exception = exceptions?.find((e: any) => {
                        const dbTime = new Date(e.session_start_time).getTime();
                        // 1s tolerance
                        return e.training_type_id === tt.id && Math.abs(dbTime - sessionStartTimestamp) < 1000;
                    });
                    const isIndividual = exception?.is_individual || false;



                    events.push({
                        id: `${tt.id}-${term.id}-${day}`,
                        time: term.time,
                        title: tt.title,
                        trainer: trainersMap.get(term.trainer_id) || '?',
                        date: dateObj,
                        isRegistered,
                        isIndividual, // Add flag
                        occupancy: {
                            current: currentOccupancy,
                            max: maxOccupancy
                        }
                    });
                });
            }
        });
    }

    // Sort by time
    events.sort((a, b) => a.time.localeCompare(b.time));

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", color: '#93745F' }}>Kalendár</h1>
            </div>

            <MonthlyCalendar currentDate={currentDate} events={events} />
        </div>
    );
}
