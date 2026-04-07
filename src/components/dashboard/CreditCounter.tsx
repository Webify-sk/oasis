import { createClient } from '@/utils/supabase/server';

export async function CreditCounter() {
    const supabase = await createClient();

    // We assume this component is used in protected routes where user exists
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('credits, unlimited_expires_at, credits_expire_at')
        .eq('id', user.id)
        .single();

    const isUnlimited = profile?.unlimited_expires_at && new Date(profile.unlimited_expires_at) > new Date();
    
    const hasUnexpiredCredits = !profile?.credits_expire_at || new Date(profile.credits_expire_at) >= new Date();
    const effectiveCredits = hasUnexpiredCredits ? (profile?.credits || 0) : 0;
    
    let expirationText = null;
    if (!isUnlimited && profile?.credits_expire_at) {
        const expirationDate = new Date(profile.credits_expire_at);
        if (expirationDate < new Date()) {
            expirationText = <div style={{ fontSize: '0.65rem', color: '#ef4444', marginTop: '2px', textTransform: 'none' }}>Expirované ({expirationDate.toLocaleDateString('sk-SK')})</div>;
        } else if (effectiveCredits > 0) {
            expirationText = <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '2px', textTransform: 'none' }}>Platnosť do: {expirationDate.toLocaleDateString('sk-SK')}</div>;
        }
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
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
                Vstupy: {isUnlimited ? <span style={{ fontSize: '1.2rem', lineHeight: '0.8' }}>∞</span> : effectiveCredits}
            </div>
            {expirationText}
        </div>
    );
}
