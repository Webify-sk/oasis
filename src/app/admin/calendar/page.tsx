import { createClient } from '@/utils/supabase/server';
import { MonthlyCalendar } from '@/components/dashboard/MonthlyCalendar';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminCalendarPage({ searchParams }: PageProps) {
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

    // 3. Generate Events for the Month
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
                    events.push({
                        id: `${tt.id}-${term.id}-${day}`,
                        time: term.time,
                        title: tt.title,
                        trainer: trainersMap.get(term.trainer_id) || '?',
                        date: dateObj
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
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: 'serif' }}>Kalendár tréningov</h1>
            </div>

            <MonthlyCalendar currentDate={currentDate} events={events} />
        </div>
    );
}
