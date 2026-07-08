import { createClient } from '@/utils/supabase/server';
import { NewsletterForm } from '@/components/admin/NewsletterForm';

export default async function AdminNewsletterPage() {
    const supabase = await createClient();

    // Fetch users (profiles) to allow selection
    const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

    // Fetch training types (for filtering recipients by attended lesson)
    const { data: trainings } = await supabase
        .from('training_types')
        .select('id, title')
        .order('title');

    // Fetch confirmed bookings (for filtering)
    const { data: bookings } = await supabase
        .from('bookings')
        .select('user_id, training_type_id')
        .eq('status', 'confirmed');

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", color: '#93745F', margin: 0 }}>
                    Newsletter / Hromadný email
                </h1>
                <p style={{ color: '#6b7280', marginTop: '0.5rem', maxWidth: '800px' }}>
                    Pošlite email vybraným alebo všetkým registrovaným členom – bez potreby vytvárať zľavu.
                </p>
            </div>

            <div style={{ padding: '0 2rem' }}>
                <NewsletterForm
                    users={users || []}
                    trainings={trainings || []}
                    bookings={bookings || []}
                />
            </div>
        </div>
    );
}
