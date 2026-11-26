import { createClient } from '@/utils/supabase/server';
import { EditTrainingClientWrapper } from '@/components/admin/EditTrainingClientWrapper';
import { getTrainingExceptions } from '../schedule-actions';
import { notFound } from 'next/navigation';

export default async function EditTrainingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    console.log('Edit Page Hit. ID:', id);
    const supabase = await createClient();

    // Fetch the training type details
    const { data: training, error } = await supabase
        .from('training_types')
        .select('*')
        .eq('id', id)
        .single();

    console.log('Fetch Result:', { training, error });

    if (error || !training) {
        console.log('Triggering Not Found');
        notFound();
    }

    // Fetch exceptions
    const exceptions = await getTrainingExceptions(id);

    // Fetch trainers for the dropdown
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
                <EditTrainingClientWrapper
                    trainers={trainers || []}
                    training={training}
                    exceptions={exceptions}
                />
            </div>
        </div>
    );
}
