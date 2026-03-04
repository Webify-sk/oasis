import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const user_id = '8a16cd1e-9937-4ded-b80c-39ea7c6204ef'; // Viky's profile

    const { data: trainer } = await supabase
        .from('trainers')
        .select('*')
        .eq('profile_id', user_id)
        .single();

    const { data: trainingTypes } = await supabase
        .from('training_types')
        .select('*');

    const myTrainingTypes = trainingTypes?.filter(tt => {
        if (!Array.isArray(tt.schedule)) return false;
        return tt.schedule.some((s: any) => s.trainer_id === trainer?.id && s.active !== false);
    }) || [];

    const sessions: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];

    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayOfWeek = d.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const dayName = dayNames[dayIndex];

        myTrainingTypes.forEach(tt => {
            if (!Array.isArray(tt.schedule)) return;
            tt.schedule.forEach((term: any) => {
                if (term.active === false) return;
                if (term.trainer_id !== trainer?.id) return;

                let matches = false;
                if (term.isRecurring !== false) {
                    if (term.day === dayName) matches = true;
                } else if (term.date) {
                    if (new Date(term.date).toDateString() === d.toDateString()) matches = true;
                }

                if (matches) {
                    let timeStr = term.time;
                    if (timeStr.includes('-')) timeStr = timeStr.split('-')[0].trim();
                    const [hours, minutes] = timeStr.split(':').map(Number);

                    if (!isNaN(hours)) {
                        const startTimestamp = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes, 0, 0);
                        const startISO = new Date(startTimestamp).toISOString();
                        sessions.push({ id: term.id, trainingTypeId: tt.id, startISO, time: term.time, dayName });
                    }
                }
            });
        });
    }

    sessions.sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());

    let sessionsWithBookings = sessions;
    if (sessions.length > 0 && myTrainingTypes.length > 0) {
        const minISO = sessions[0].startISO;
        const maxISO = sessions[sessions.length - 1].startISO;
        const { data: bookings } = await supabase
            .from('bookings')
            .select('*')
            .in('training_type_id', myTrainingTypes.map(tt => tt.id))
            .gte('start_time', minISO)
            .lte('start_time', maxISO);

        sessionsWithBookings = sessions.map(session => {
            const sb = bookings?.filter(b => b.training_type_id === session.trainingTypeId && Math.abs(new Date(b.start_time).getTime() - new Date(session.startISO).getTime()) < 60000) || [];
            return { ...session, matchedBookings: sb.length };
        });

        return NextResponse.json({ trainer, myTrainingTypesCount: myTrainingTypes.length, sessionsWithBookings, rawBookingsCount: bookings?.length || 0 });
    }

    return NextResponse.json({ trainer, myTrainingTypesCount: myTrainingTypes.length, sessions });
}
