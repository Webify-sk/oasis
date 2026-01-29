import { createClient } from '@/utils/supabase/server';
import { TrainingForm } from '@/components/admin/TrainingForm';

export default async function NewTrainingPage() {
    const supabase = await createClient();

    // Fetch trainers for dropdown
    const { data: trainers } = await supabase
        .from('trainers')
        .select('id, full_name');

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <TrainingForm trainers={trainers || []} />
            </div>
        </div>
    );
}
