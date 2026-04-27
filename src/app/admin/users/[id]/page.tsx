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

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                {/* @ts-ignore */}
                <UserForm initialData={{...user, batches: batches || []}} />
            </div>
        </div>
    );
}
