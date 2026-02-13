import { createClient } from '@/utils/supabase/server';
import { PublicCalendar } from '@/components/public/PublicCalendar';

// Force dynamic rendering to handle searchParams properly
export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EmbedCalendarPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const params = await searchParams;
    const dateParam = typeof params.date === 'string' ? params.date : undefined;

    const today = new Date();
    const currentDate = dateParam ? new Date(dateParam) : today;

    // Validate Date
    if (isNaN(currentDate.getTime())) {
        // Fallback default
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 1. Fetch Training Types (Publicly readable)
    const { data: trainingTypes } = await supabase
        .from('training_types')
        .select('*');

    // 2. Fetch Trainers (Publicly readable)
    const { data: trainers } = await supabase
        .from('trainers')
        .select('id, full_name');
    const trainersMap = new Map(trainers?.map(t => [t.id, t.full_name]) || []);

    // 3. Generate Events for the Month
    const events: any[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];

    // 4. Fetch Bookings (UTC logic to match Dashboard)
    // Use UTC for consistent querying regardless of server timezone
    const startDate = new Date(Date.UTC(year, month, 1)).toISOString();
    const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();

    const { data: monthlyBookings } = await supabase
        .from('bookings')
        .select('training_type_id, start_time')
        .gte('start_time', startDate)
        .lt('start_time', endDate);

    const allBookings = monthlyBookings || [];

    // Debug logs can be removed or kept if needed, but the logic changes below
    console.log('DEBUG: Monthly bookings count:', allBookings.length);

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dayName = dayNames[dateObj.getDay()];

        trainingTypes?.forEach((tt: any) => {
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
                    let timeStr = term.time;
                    if (timeStr.includes('-')) timeStr = timeStr.split('-')[0].trim();
                    const [hours, minutes] = timeStr.split(':').map(Number);

                    // IMPORTANT: Construct Date in UTC to match DB "Face Value" storage
                    // The DB stores "08:30" as "08:30 UTC"
                    const sessionStartTimestamp = Date.UTC(year, month, day, hours, minutes, 0, 0);

                    // Calculate Occupancy with fuzzy matching
                    const currentBookings = allBookings.filter((b: any) => {
                        const bDate = new Date(b.start_time);
                        return b.training_type_id === tt.id && Math.abs(bDate.getTime() - sessionStartTimestamp) < 60000;
                    }).length;

                    if (currentBookings > 0) {
                        console.log(`DEBUG: Found ${currentBookings} bookings for ${tt.title} at ${term.time}`);
                    }

                    // Construct local date for display props
                    const displayDate = new Date(dateObj);
                    displayDate.setHours(hours, minutes, 0, 0);

                    events.push({
                        id: `${tt.id}-${term.id}-${day}`, // Unique ID
                        time: term.time,
                        title: tt.title,
                        trainer: trainersMap.get(term.trainer_id) || '?',
                        date: displayDate,
                        totalCapacity: tt.capacity || 10,
                        bookedCount: currentBookings,
                        isRegistered: false // Public view never shows registration
                    });
                });
            }
        });
    }

    // Sort events by time
    events.sort((a, b) => a.time.localeCompare(b.time));

    return (
        <div style={{ backgroundColor: 'transparent', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <PublicCalendar currentDate={currentDate} events={events} />
        </div>
    );
}
