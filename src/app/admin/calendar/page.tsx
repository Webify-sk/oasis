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

    // Helper for local date string YYYY-MM-DD
    const toDateStr = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    // Visible grid range: 6 weeks (42 cells) starting from the Monday on/before the 1st,
    // so leading/trailing days from the adjacent months are also populated.
    const firstOfMonth = new Date(year, month, 1);
    let startOffset = firstOfMonth.getDay() - 1; // Monday = 0
    if (startOffset === -1) startOffset = 6;
    const TOTAL_CELLS = 42;
    const gridStart = new Date(year, month, 1 - startOffset);
    const gridEnd = new Date(year, month, 1 - startOffset + (TOTAL_CELLS - 1));

    const gridStartStr = toDateStr(gridStart);
    const gridEndStr = toDateStr(gridEnd);

    // 2b. Fetch vacations overlapping the visible range (global or per-trainer)
    const { data: vacations } = await supabase
        .from('vacations')
        .select('id, start_time, end_time, description, trainer_id')
        .lte('start_time', `${gridEndStr}T23:59:59.999Z`)
        .gte('end_time', `${gridStartStr}T00:00:00.000Z`);

    // 3. Generate Events for every visible day
    const events: any[] = [];
    const dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];

    for (let i = 0; i < TOTAL_CELLS; i++) {
        const dateObj = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
        const dayName = dayNames[dateObj.getDay()];
        const dayStr = toDateStr(dateObj);

        trainingTypes?.forEach(tt => {
            if (Array.isArray(tt.schedule)) {
                // Find matching terms for this specific day.
                // Recurring terms match by weekday; one-time terms match by exact date.
                const terms = tt.schedule.filter((term: any) => {
                    if (term.active === false) return false;

                    if (term.isRecurring !== false) {
                        return term.day === dayName;
                    }

                    if (term.date) {
                        const termDate = new Date(term.date);
                        return termDate.toDateString() === dateObj.toDateString();
                    }

                    return false;
                });

                terms.forEach((term: any) => {
                    events.push({
                        id: `${tt.id}-${term.id}-${dayStr}`,
                        time: term.time,
                        title: tt.title,
                        trainer: trainersMap.get(term.trainer_id) || '?',
                        date: dateObj
                    });
                });
            }
        });

        // Vacation banners for this day (compare on face-value date strings)
        vacations?.forEach(vac => {
            const vacStart = (vac.start_time as string).slice(0, 10);
            const vacEnd = (vac.end_time as string).slice(0, 10);
            if (dayStr >= vacStart && dayStr <= vacEnd) {
                const trainerName = vac.trainer_id ? (trainersMap.get(vac.trainer_id) || 'Neznámy tréner') : '';
                events.push({
                    id: `vac-${vac.id}-${dayStr}`,
                    type: 'vacation',
                    time: '',
                    title: vac.trainer_id ? `Dovolenka – ${trainerName}` : 'Zatvorené – celé štúdio',
                    trainer: trainerName,
                    description: vac.description,
                    vacStart: vac.start_time,
                    vacEnd: vac.end_time,
                    date: dateObj
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
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", color: '#93745F' }}>Kalendár tréningov</h1>
            </div>

            <MonthlyCalendar currentDate={currentDate} events={events} />
        </div>
    );
}
