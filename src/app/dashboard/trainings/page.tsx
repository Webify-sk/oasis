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

    // Start from anchorDate (safeAnchorDate)
    const startDate = new Date(safeAnchorDate);
    startDate.setHours(0, 0, 0, 0);

    const daysToShow = typeof params?.days === 'string' ? parseInt(params.days, 10) : 7;

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysToShow - 1);
    endDate.setHours(23, 59, 59, 999);

    const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

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

    for (let i = 0; i < daysToShow; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);

        // Calculate 0-6 index for dayNames (Mon=0...Sun=6) based on getDay() (Sun=0...Sat=6)
        const dayOfWeek = d.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        weekDates.push({
            dateObj: d,
            dayName: dayNames[dayIndex],
            formattedDate: `${dayNames[dayIndex]}, ${d.getDate()}. ${d.toLocaleString('sk-SK', { month: 'long' })}`
        });
    }

    // 3b. Fetch Exceptions for the week
    const { data: exceptions } = await supabase
        .from('training_session_exceptions')
        .select('*')
        .in('training_type_id', trainingTypes?.map(t => t.id) || [])
        .gte('session_start_time', startDate.toISOString())
        .lte('session_start_time', endDate.toISOString());

    // 3c. Fetch Vacations for the week
    const { data: vacations } = await supabase
        .from('vacations')
        .select('*')
        // Overlap logic: vacation_start <= week_end AND vacation_end >= week_start
        .lte('start_time', endDate.toISOString())
        .gte('end_time', startDate.toISOString());

    const scheduleData = weekDates.map(wd => {
        const sessionsForDay: any[] = [];

        trainingTypes?.forEach(tt => {
            if (Array.isArray(tt.schedule)) {
                // Filter terms for this day
                const terms = tt.schedule.filter((term: any) => {
                    if (term.active === false) return false;

                    // Recurring Logic
                    if (term.isRecurring !== false) {
                        return term.day === wd.dayName;
                    }

                    // One-time Date Logic
                    if (term.date) {
                        const termDate = new Date(term.date);
                        // Compare YYYY-MM-DD
                        return termDate.toDateString() === wd.dateObj.toDateString();
                    }

                    return false;
                });

                terms.forEach((term: any) => {
                    // 1. Parse time "HH:MM"
                    let timeStr = term.time;
                    if (timeStr.includes('-')) {
                        timeStr = timeStr.split('-')[0].trim();
                    }

                    if (!timeStr || !timeStr.includes(':')) {
                        return;
                    }

                    const [hours, minutes] = timeStr.split(':').map(Number);
                    if (isNaN(hours) || isNaN(minutes)) {
                        return;
                    }

                    // 2. Construct "FACE VALUE" UTC Timestamp for the session
                    // This matches how DB stores it ("18:00" -> "18:00 Z")
                    const sessionStartTimestamp = Date.UTC(wd.dateObj.getFullYear(), wd.dateObj.getMonth(), wd.dateObj.getDate(), hours, minutes, 0, 0);

                    // 3. Construct "FACE VALUE" UTC Timestamp for NOW (in Bratislava)
                    // We want: If it is 18:30 in Bratislava, we want a timestamp for 18:30 UTC to compare with session 18:00 UTC.
                    const now = new Date();
                    const bratislavaTimeStr = now.toLocaleString('en-US', { timeZone: 'Europe/Bratislava', hour12: false });
                    const bratislavaDate = new Date(bratislavaTimeStr);
                    // bratislavaDate is now a Date object where .getHours() / .getDate() etc returns the local Bratislava time values 
                    // BUT .getTime() is shifted. We need to construct a UTC timestamp from its components.
                    const nowFaceValue = Date.UTC(
                        bratislavaDate.getFullYear(),
                        bratislavaDate.getMonth(),
                        bratislavaDate.getDate(),
                        bratislavaDate.getHours(),
                        bratislavaDate.getMinutes(),
                        bratislavaDate.getSeconds()
                    );

                    const isPast = sessionStartTimestamp < nowFaceValue;

                    // 4. Client-side ISO string (still needs to be what the calendar expects)
                    // We can stick to the UTC string.
                    const sessionStartISO = new Date(sessionStartTimestamp).toISOString();

                    // Check for exception
                    const exception = exceptions?.find((e: any) => {
                        // Robust comparison: Compare time values or substrings
                        const dbTime = new Date(e.session_start_time).getTime();
                        const sessionTime = new Date(sessionStartISO).getTime();
                        // 1s tolerance for any microsecond differences
                        return e.training_type_id === tt.id && Math.abs(dbTime - sessionTime) < 1000;
                    });

                    const isIndividual = exception?.is_individual || false;

                    // Check for VACATIONS
                    // We need to fetch vacations first (will add fetch above loop)
                    const isVacation = vacations?.some((v: any) => {
                        const vStart = new Date(v.start_time).getTime();
                        const vEnd = new Date(v.end_time).getTime();
                        const sessionTime = new Date(sessionStartISO).getTime();

                        // Debug overlaps
                        // if (sessionTime >= vStart && sessionTime < vEnd) {
                        //    console.log(`[Vacation Match] Session: ${sessionStartISO} (${sessionTime}) matches Vacation: ${v.start_time} - ${v.end_time}`);
                        // }

                        return sessionTime >= vStart && sessionTime < vEnd;
                    });

                    // 5. Calculate Occupancy with 60s Fuzzy Match
                    const slotBookings = bookings?.filter((b: any) => {
                        const bDate = new Date(b.start_time);
                        return b.training_type_id === tt.id && Math.abs(bDate.getTime() - sessionStartTimestamp) < 60000;
                    }) || [];

                    const currentOccupancy = slotBookings.reduce((sum: number, b: any) => sum + (b.participants_count || 1), 0);


                    const userBooking = user ? slotBookings.find((b: any) => b.user_id === user.id) : null;
                    const isUserRegistered = !!userBooking;

                    sessionsForDay.push({
                        id: `${tt.id}-${term.id}-${wd.dateObj.getDate()}`,
                        trainingTypeId: tt.id,
                        startTimeISO: sessionStartISO,
                        time: term.time,
                        name: tt.title,
                        trainer: trainersMap.get(term.trainer_id) || 'Neznámy tréner',
                        level: tt.level || 'Všetky úrovne',
                        priceCredits: tt.price_credits ?? 1,
                        occupancy: {
                            current: isVacation ? (tt.capacity || 10) : currentOccupancy, // If vacation, show as FULL
                            max: tt.capacity || 10
                        },
                        isUserRegistered,
                        bookingId: userBooking?.id,
                        participantsCount: userBooking?.participants_count || 1,
                        isPast,
                        isIndividual // Pass the flag
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



    // 4. Fetch User Credits (for instant client-side validation)
    let userCredits = 0;
    let isUnlimited = false;
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('credits, unlimited_expires_at').eq('id', user.id).single();
        userCredits = profile?.credits || 0;
        isUnlimited = profile?.unlimited_expires_at && new Date(profile.unlimited_expires_at) > new Date();
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

            <TrainingCalendar
                schedule={scheduleData}
                userCredits={userCredits}
                currentDays={daysToShow}
                isUnlimited={isUnlimited}
            />
        </div>
    );
}
