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

    // Fetch booking counts for each training type
    // We'll count all active/future bookings to be useful.
    // Or just all bookings? Let's do all for now to be safe, or start_time > now()
    const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('training_type_id'); // Removed .is('status', 'confirmed') temporarily to check if we get ANYTHING

    console.log('Admin Page Debug - All Bookings:', allBookings);
    console.log('Admin Page Debug - Bookings Error:', bookingsError);

    const counts = new Map();
    allBookings?.forEach((b: any) => {
        counts.set(b.training_type_id, (counts.get(b.training_type_id) || 0) + 1);
    });

    console.log('Admin Page Debug - Counts Map:', Object.fromEntries(counts));

    const trainings = trainingsData?.map(t => ({
        ...t,
        bookingCount: counts.get(t.id) || 0
    }));

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
