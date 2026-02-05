import { createClient } from '@/utils/supabase/server';
import { TrainingList } from '@/components/admin/TrainingList';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import styles from '@/components/ui/Button.module.css';

export default async function AdminTrainingsPage() {
    const supabase = await createClient();

    // Fetch all training types
    const { data: trainingsData, error } = await supabase
        .from('training_types')
        .select('*')
        .order('created_at', { ascending: false });

    // Fetch all active/future bookings with user details
    const now = new Date();
    // Show sessions from today onwards (or maybe just all active ones?)
    // Let's show from start of today to keep it relevant.
    now.setHours(0, 0, 0, 0);
    const fromDate = now.toISOString();

    const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
            start_time,
            training_type_id,
            profiles (
                full_name,
                email
            )
        `)
        .gte('start_time', fromDate)
        .order('start_time', { ascending: true });

    // Group bookings by TrainingType -> Session (StartTime)
    // Structure: Map<TrainingId, Map<StartTime, Attendee[]>>
    const trainingSessions = new Map<string, Map<string, any[]>>();
    const totalCounts = new Map<string, number>();

    bookingsData?.forEach((b: any) => {
        const tid = b.training_type_id;
        const time = b.start_time;
        const attendee = b.profiles;

        // Total Count
        totalCounts.set(tid, (totalCounts.get(tid) || 0) + 1);

        // Session Grouping
        if (!trainingSessions.has(tid)) {
            trainingSessions.set(tid, new Map());
        }
        const sessions = trainingSessions.get(tid)!;

        if (!sessions.has(time)) {
            sessions.set(time, []);
        }
        if (attendee) {
            sessions.get(time)!.push(attendee);
        }
    });

    const trainings = trainingsData?.map(t => {
        const sessionsMap = trainingSessions.get(t.id);
        const sessions = sessionsMap
            ? Array.from(sessionsMap.entries()).map(([start, attendees]) => ({ start, attendees }))
            : [];

        // Sort sessions by date
        sessions.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        return {
            ...t,
            bookingCount: totalCounts.get(t.id) || 0,
            upcomingSessions: sessions
        };
    });

    return (
        <div style={{ padding: '0rem' }} >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: 'serif' }}>Tréningy</h1>

                <Link
                    href="/admin/trainings/new"
                    className={clsx(styles.button, styles.primary, styles.md)}
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <Plus size={18} style={{ marginRight: '0.5rem' }} />
                    PRIDAŤ TRÉNING
                </Link>
            </div>

            <div style={{ padding: '0 2rem' }}>
                <TrainingList trainings={trainings || []} />
            </div>
        </div >
    );
}
