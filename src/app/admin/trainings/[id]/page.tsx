import { createClient } from '@/utils/supabase/server';
import { TrainingForm } from '@/components/admin/TrainingForm';
import { SessionManager } from '@/components/admin/SessionManager';
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
    const { data: trainers } = await supabase
        .from('trainers')
        .select('id, full_name');

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <TrainingForm
                    trainers={trainers || []}
                    initialData={training}
                />

                <SessionManager
                    training={training}
                    exceptions={exceptions}
                />
            </div>
        </div>
    );
}
