import { MilestoneList } from '@/components/dashboard/MilestoneList';
import { CreditCounter } from '@/components/dashboard/CreditCounter';
import { createClient } from '@/utils/supabase/server';

export default async function MilestonesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch User Booking Count
    let bookingCount = 0;
    if (user) {
        const { count, error } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        bookingCount = count || 0;
    }

    // 2. Fetch Milestones Definition
    const { data: milestones } = await supabase
        .from('milestones')
        .select('*')
        .order('training_count_required', { ascending: true });

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: 'serif' }}>História</h1>

                <CreditCounter />
            </div>

            <div style={{ padding: '0 2rem' }}>
                <MilestoneList
                    milestones={milestones || []}
                    currentProgress={bookingCount}
                />
            </div>
        </div>
    );
}
