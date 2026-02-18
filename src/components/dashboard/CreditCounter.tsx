import { createClient } from '@/utils/supabase/server';

export async function CreditCounter() {
    const supabase = await createClient();

    // We assume this component is used in protected routes where user exists
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('credits, unlimited_expires_at')
        .eq('id', user.id)
        .single();

    // Check unlimited
    const isUnlimited = profile?.unlimited_expires_at && new Date(profile.unlimited_expires_at) > new Date();

    return (
        <div style={{
            border: '1px solid #ccc',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            backgroundColor: '#fff',
            whiteSpace: 'nowrap'
        }}>
            Vstupy: {isUnlimited ? <span style={{ fontSize: '1.2rem', lineHeight: '0.8' }}>∞</span> : (profile?.credits || 0)}
        </div>
    );
}
