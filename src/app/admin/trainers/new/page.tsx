import { createClient } from '@/utils/supabase/server';
import { TrainerForm } from '@/components/admin/TrainerForm';

export default async function NewTrainerPage() {
    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <TrainerForm />
            </div>
        </div>
    );
}
