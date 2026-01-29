import { createClient } from '@/utils/supabase/server';
import { TrainerForm } from '@/components/admin/TrainerForm';
import { notFound } from 'next/navigation';

export default async function EditTrainerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch the trainer details
    const { data: trainer, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !trainer) {
        notFound();
    }

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <TrainerForm initialData={trainer} />
            </div>
        </div>
    );
}
