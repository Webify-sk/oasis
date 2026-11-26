import { createClient } from '@/utils/supabase/server';
import { TrainingForm } from '@/components/admin/TrainingForm';

export default async function NewTrainingPage() {
    const supabase = await createClient();

    // Fetch trainers for dropdown
    // select('*') so this keeps working before the is_active column exists
    const { data: trainersRaw } = await supabase
        .from('trainers')
        .select('*');
    const trainers = (trainersRaw || [])
        .map(t => ({ id: t.id as string, full_name: t.is_active === false ? `${String(t.full_name).trim()} (neaktívny)` : t.full_name as string, inactive: t.is_active === false }))
        .sort((a, b) => Number(a.inactive) - Number(b.inactive))
        .map(({ id, full_name }) => ({ id, full_name }));

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
