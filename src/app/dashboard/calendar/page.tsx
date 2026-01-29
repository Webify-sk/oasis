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

    // 3. Fetch User Bookings for the Month (to highlight)
    const { data: { user } } = await supabase.auth.getUser();
    let userBookings: any[] = [];

    if (user) {
        const startDate = new Date(year, month, 1).toISOString();
        const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

        const { data: bookings } = await supabase
            .from('bookings')
            .select('training_type_id, start_time')
            .eq('user_id', user.id)
            .gte('start_time', startDate)
            .lte('start_time', endDate);

        userBookings = bookings || [];
    }

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
                const terms = tt.schedule.filter((term: any) => term.day === dayName && term.active !== false);

                terms.forEach((term: any) => {
                    // Calculate exact start time for matching
                    let timeStr = term.time;
                    if (timeStr.includes('-')) timeStr = timeStr.split('-')[0].trim();
                    const [hours, minutes] = timeStr.split(':').map(Number);

                    const sessionStart = new Date(dateObj);
                    sessionStart.setHours(hours, minutes, 0, 0);

                    // Check if user has a booking for this type at this time
                    // ISO string comparison might be tricky due to timezones, so we compare timestamps or close enough
                    // Ideally database stores UTC. detailed comparison:
                    const isRegistered = userBookings.some(b => {
                        const bDate = new Date(b.start_time);
                        return b.training_type_id === tt.id && bDate.getTime() === sessionStart.getTime();
                    });

                    events.push({
                        id: `${tt.id}-${term.id}-${day}`,
                        time: term.time,
                        title: tt.title,
                        trainer: trainersMap.get(term.trainer_id) || '?',
                        date: dateObj,
                        isRegistered // Add flag
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
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: 'serif' }}>Kalendár</h1>
            </div>

            <MonthlyCalendar currentDate={currentDate} events={events} />
        </div>
    );
}
