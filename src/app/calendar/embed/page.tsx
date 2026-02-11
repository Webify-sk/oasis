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
                    const eventDate = new Date(dateObj);
                    // Parse time if needed for sorting, but we just display it

                    events.push({
                        id: `${tt.id}-${term.id}-${day}`, // Unique ID
                        time: term.time,
                        title: tt.title,
                        trainer: trainersMap.get(term.trainer_id) || '?',
                        date: eventDate,
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
