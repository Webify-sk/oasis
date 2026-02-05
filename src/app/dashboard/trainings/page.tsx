import Link from 'next/link';
import { TrainingCalendar } from '@/components/dashboard/TrainingCalendar';
import { CreditCounter } from '@/components/dashboard/CreditCounter';
import { Plus } from 'lucide-react';
import styles from '@/components/ui/Button.module.css';
import clsx from 'clsx';
import { createClient } from '@/utils/supabase/server';
import pageStyles from './page.module.css';

import { MyBookings } from '@/components/dashboard/MyBookings';

export default async function TrainingsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const supabase = await createClient();
    const params = await searchParams;

    // 1. Fetch Training Types (with schedule)
    const { data: trainingTypes } = await supabase
        .from('training_types')
        .select('*');

    // 2. Fetch Trainers for name resolution
    const { data: trainers } = await supabase
        .from('trainers')
        .select('id, full_name');

    const trainersMap = new Map(trainers?.map(t => [t.id, t.full_name]) || []);

    // 3. Generate Schedule for SELECTED WEEK (Default: Current Week)
    const dateParam = typeof params?.date === 'string' ? params.date : undefined;
    const anchorDate = dateParam ? new Date(dateParam) : new Date();

    // Validate anchorDate
    if (isNaN(anchorDate.getTime())) {
        // Fallback to today if invalid
        // anchorDate = new Date(); // Re-assignment not possible with const, handle logic below
    }
    const safeAnchorDate = isNaN(anchorDate.getTime()) ? new Date() : anchorDate;

    const currentDay = safeAnchorDate.getDay();
    const diffToMon = currentDay === 0 ? -6 : 1 - currentDay;

    // Get start and end of week for query range
    const mondayDate = new Date(safeAnchorDate);
    mondayDate.setDate(safeAnchorDate.getDate() + diffToMon);
    mondayDate.setHours(0, 0, 0, 0);

    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    sundayDate.setHours(23, 59, 59, 999);

    const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('start_time', mondayDate.toISOString())
        .lte('start_time', sundayDate.toISOString());

    const { data: { user } } = await supabase.auth.getUser();

    // Fetch My Future Bookings (Limit to future relative to NOW, not view)
    let myUpcomingBookings: any[] = [];
    if (user) {
        const { data } = await supabase
            .from('bookings')
            .select(`
                id,
                start_time,
                training_type:training_types (
                    title,
                    level
                )
            `)
            .eq('user_id', user.id)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });

        myUpcomingBookings = data || [];
    }

    const weekDates = [];
    const dayNames = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];

    for (let i = 0; i < 7; i++) {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        weekDates.push({
            dateObj: d,
            dayName: dayNames[i],
            formattedDate: `${dayNames[i]}, ${d.getDate()}. ${d.toLocaleString('sk-SK', { month: 'long' })}`
        });
    }

    const scheduleData = weekDates.map(wd => {
        const sessionsForDay: any[] = [];

        trainingTypes?.forEach(tt => {
            if (Array.isArray(tt.schedule)) {
                // Find terms for this day. Relax active check: show if active is true OR undefined (legacy), unless explicitly false.
                const terms = tt.schedule.filter((term: any) => term.day === wd.dayName && term.active !== false);

                terms.forEach((term: any) => {
                    // Construct EXACT start time ISO string for this session
                    // term.time is "18:00". wd.dateObj has correct date.
                    let timeStr = term.time;
                    if (timeStr.includes('-')) {
                        timeStr = timeStr.split('-')[0].trim();
                    }

                    if (!timeStr || !timeStr.includes(':')) {
                        console.log('Skipping invalid time:', term.time);
                        return;
                    }

                    const [hours, minutes] = timeStr.split(':').map(Number);
                    if (isNaN(hours) || isNaN(minutes)) {
                        console.log('Skipping NaN time:', term.time);
                        return;
                    }

                    const sessionStart = new Date(wd.dateObj);
                    sessionStart.setHours(hours, minutes, 0, 0);
                    const sessionStartISO = sessionStart.toISOString();

                    // Count bookings for this specific slot
                    const slotBookings = bookings?.filter((b: any) =>
                        b.training_type_id === tt.id &&
                        new Date(b.start_time).toISOString() === sessionStartISO
                    ) || [];

                    const userBooking = user ? slotBookings.find((b: any) => b.user_id === user.id) : null;
                    const isUserRegistered = !!userBooking;

                    sessionsForDay.push({
                        id: `${tt.id}-${term.id}-${wd.dateObj.getDate()}`, // Include Day of Month to match MonthlyCalendar ID
                        trainingTypeId: tt.id, // Needed for action
                        startTimeISO: sessionStartISO, // Needed for action
                        time: term.time,
                        name: tt.title,
                        trainer: trainersMap.get(term.trainer_id) || 'Neznámy tréner',
                        level: tt.level || 'Všetky úrovne',
                        occupancy: {
                            current: slotBookings.length,
                            max: tt.capacity || 10
                        },
                        isUserRegistered,
                        bookingId: userBooking?.id // Pass ID for robust cancellation
                    });
                });
            }
        });

        // Sort by time
        sessionsForDay.sort((a, b) => a.time.localeCompare(b.time));

        return {
            date: wd.formattedDate, // e.g. "Pondelok, 20. Január"
            sessions: sessionsForDay,
            originalDate: wd.dateObj // For checking if it's in the past if needed
        };
    });

    // Filter out past days (keep today and future)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const filteredScheduleData = scheduleData.filter(day => {
        const dayDate = new Date(day.originalDate);
        return dayDate >= todayStart;
    });

    // 4. Fetch User Credits (for instant client-side validation)
    let userCredits = 0;
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
        userCredits = profile?.credits || 0;
    }

    return (
        <div style={{ padding: '0rem' }}>
            <div className={pageStyles.headerContainer}>
                <h1 className={pageStyles.title}>Tréningy</h1>

                <div className={pageStyles.actions}>
                    <CreditCounter />

                    <Link
                        href="/dashboard/credit"
                        className={clsx(styles.button, styles.primary, styles.md, pageStyles.dobitButton)}
                        style={{ backgroundColor: '#5E715D', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                    >
                        <Plus size={16} style={{ marginRight: '0.5rem' }} />
                        DOBIŤ VSTUPY
                    </Link>
                </div>
            </div>

            <MyBookings bookings={myUpcomingBookings} />

            <TrainingCalendar schedule={filteredScheduleData} userCredits={userCredits} />
        </div>
    );
}
