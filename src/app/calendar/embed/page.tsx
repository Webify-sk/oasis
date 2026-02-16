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
    // 4. Fetch Bookings (UTC logic to match Dashboard)
    // Use UTC for consistent querying regardless of server timezone
    const startDate = new Date(Date.UTC(year, month, 1)).toISOString();
    // Extend end date by 15 days into next month to cover overlap
    const endDate = new Date(Date.UTC(year, month + 1, 15, 23, 59, 59, 999)).toISOString();

    const { data: monthlyBookings } = await supabase
        .from('bookings')
        .select('training_type_id, start_time')
        .gte('start_time', startDate)
        .lt('start_time', endDate);

    // 4b. Fetch Exceptions for the month
    const { data: exceptions } = await supabase
        .from('training_session_exceptions')
        .select('*')
        .in('training_type_id', trainingTypes?.map(t => t.id) || [])
        .gte('session_start_time', startDate)
        .lte('session_start_time', endDate);

    // 4c. Fetch Vacations for the month
    const { data: vacations } = await supabase
        .from('vacations')
        .select('*')
        .lte('start_time', endDate)
        .gte('end_time', startDate);

    const allBookings = monthlyBookings || [];

    // Debug logs can be removed or kept if needed, but the logic changes below
    // console.log('DEBUG: Monthly bookings count:', allBookings.length);

    // 4. Generate Events
    const events: any[] = [];
    const dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];

    const loopStart = new Date(year, month, 1);
    const loopEnd = new Date(year, month + 1, 15); // Go 15 days into next month

    for (let d = new Date(loopStart); d <= loopEnd; d.setDate(d.getDate() + 1)) {
        const dateObj = new Date(d);
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
                    const sessionStartTimestamp = Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), hours, minutes, 0, 0);

                    // Check for VACATIONS
                    const isVacation = vacations?.some((v: any) => {
                        const vStart = new Date(v.start_time).getTime();
                        const vEnd = new Date(v.end_time).getTime();
                        // sessionStartTimestamp is already UTC timestamp constructed from Face Value
                        return sessionStartTimestamp >= vStart && sessionStartTimestamp < vEnd;
                    });

                    // Check for exception (Individual)
                    const exception = exceptions?.find((e: any) => {
                        const dbTime = new Date(e.session_start_time).getTime();
                        // 1s tolerance
                        return e.training_type_id === tt.id && Math.abs(dbTime - sessionStartTimestamp) < 1000;
                    });
                    const isIndividual = exception?.is_individual || false;

                    const maxOccupancy = tt.capacity || 10;

                    // Calculate Occupancy with fuzzy matching
                    const currentBookings = allBookings.filter((b: any) => {
                        const bDate = new Date(b.start_time);
                        return b.training_type_id === tt.id && Math.abs(bDate.getTime() - sessionStartTimestamp) < 60000;
                    }).length;

                    // If vacation, report max occupancy (full)
                    // If individual, it might have differnet capacity but for public view, we mainly care about "is it full?"
                    // Individual sessions usually have capacity 1 (or limited), but let's stick to standard logic:
                    // If vacation -> return full.
                    // If individual -> visual indication.

                    const effectiveBookedCount = isVacation ? maxOccupancy : currentBookings;

                    // For debug
                    // if (currentBookings > 0) { ... }

                    // Construct local date for display props
                    const displayDate = new Date(dateObj);
                    displayDate.setHours(hours, minutes, 0, 0);

                    events.push({
                        id: `${tt.id}-${term.id}-${dateObj.getDate()}-${dateObj.getMonth()}`, // Unique ID with month
                        time: term.time,
                        title: tt.title,
                        trainer: trainersMap.get(term.trainer_id) || '?',
                        date: displayDate,
                        totalCapacity: maxOccupancy,
                        bookedCount: effectiveBookedCount,
                        isRegistered: false, // Public view never shows registration
                        isIndividual // Pass flag
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
