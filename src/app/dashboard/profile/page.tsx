import { createClient } from '@/utils/supabase/server';
import { ProfileForm } from '@/components/dashboard/ProfileForm';
import { CreditCounter } from '@/components/dashboard/CreditCounter';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // If profile doesn't exist yet (signup trigger might have failed or pending), use basic auth data
    const userData = {
        email: user.email,
        full_name: profile?.full_name,
        phone: profile?.phone,
        date_of_birth: profile?.date_of_birth,
        credits: profile?.credits || 0,
        role: profile?.role,
        billing_name: profile?.billing_name,
        billing_street: profile?.billing_street,
        billing_city: profile?.billing_city,
        billing_zip: profile?.billing_zip,
        billing_country: profile?.billing_country
    };

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", color: '#93745F' }}>Môj profil</h1>

                {profile?.role !== 'employee' && <CreditCounter />}
            </div>

            <div style={{ padding: '0 2rem' }}>
                <ProfileForm user={userData} />
            </div>
        </div>
    );
}
