import { createClient } from '@/utils/supabase/server';
import { UserForm } from '@/components/admin/UserForm';
import { notFound } from 'next/navigation';

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch the user profile details
    const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !user) {
        notFound();
    }

    // FÁZA 2: Získanie aktívnych dávok
    const { data: batches } = await supabase
        .from('credit_batches')
        .select('*')
        .eq('user_id', id)
        .gt('remaining_amount', 0)
        .order('expires_at', { ascending: true, nullsFirst: false });

    // Trainer record linked to this account, and records still without one (for the picker)
    const { data: allTrainers } = await supabase
        .from('trainers')
        .select('id, full_name, profile_id');
    const linkedTrainer = (allTrainers || []).find(t => t.profile_id === id);
    const trainersWithoutAccount = (allTrainers || [])
        .filter(t => !t.profile_id)
        .map(t => ({ id: t.id, full_name: t.full_name }));

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                {/* @ts-ignore */}
                <UserForm
                    initialData={{...user, batches: batches || []}}
                    linkedTrainerName={linkedTrainer ? linkedTrainer.full_name.trim() : null}
                    trainersWithoutAccount={trainersWithoutAccount}
                />
            </div>
        </div>
    );
}
