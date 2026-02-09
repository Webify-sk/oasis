import { createClient } from '@/utils/supabase/server';
import { TrainerForm } from '@/components/admin/TrainerForm';
import { notFound } from 'next/navigation';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

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
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <Link
                href="/admin/trainers"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#666',
                    marginBottom: '2rem',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 500
                }}
            >
                <ChevronLeft size={20} />
                Späť na zoznam
            </Link>

            <TrainerForm initialData={trainer} />
        </div>
    );
}
