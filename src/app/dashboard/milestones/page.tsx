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
    const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .order('training_count_required', { ascending: true });

    // Fallback if DB is empty or permissions fail
    const milestones = (milestonesData && milestonesData.length > 0) ? milestonesData : [
        {
            id: 1,
            title: 'Core Commitment',
            subtitle: '2 vstupy grátis',
            description: '',
            training_count_required: 50,
            reward: '2 vstupy grátis'
        },
        {
            id: 2,
            title: 'Inner Glow Achiever',
            subtitle: 'Telové alebo pleťové ošetrenie grátis',
            description: '',
            training_count_required: 100,
            reward: 'Telové alebo pleťové ošetrenie'
        },
        {
            id: 3,
            title: 'Elite Flow',
            subtitle: '5 vstupov grátis + telové alebo pleťové ošetrenie grátis',
            description: '',
            training_count_required: 150,
            reward: '5 vstupov + ošetrenie'
        },
        {
            id: 4,
            title: 'Oasis Icon',
            subtitle: '10% zľava + 10 vstupov + ošetrenie',
            description: '10% zľava na všetky procedúry doživotne, 10 vstupová permanentka grátis + telové a pleťové ošetrenie grátis',
            training_count_required: 200,
            reward: '10% zľava + 10 vstupov + ošetrenie'
        }
    ];

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
                    milestones={milestones}
                    currentProgress={bookingCount}
                />
            </div>
        </div>
    );
}
