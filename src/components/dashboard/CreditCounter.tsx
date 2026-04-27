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
        
    const { data: activeBatchesData } = await supabase
        .from('credit_batches')
        .select('amount, remaining_amount, expires_at')
        .eq('user_id', user.id)
        .gt('remaining_amount', 0)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .order('expires_at', { ascending: true, nullsFirst: false });

    const isUnlimited = profile?.unlimited_expires_at && new Date(profile.unlimited_expires_at) > new Date();
    
    const activeBatches = activeBatchesData || [];
    const effectiveCredits = activeBatches.reduce((acc, b) => acc + Number(b.remaining_amount), 0);
    const hasActiveBatches = activeBatches.length > 0;
    const hasExpired = !!profile?.credits_expire_at && new Date(profile.credits_expire_at) < new Date() && !hasActiveBatches;

    let expirationText = null;
    if (!isUnlimited) {
        if (hasActiveBatches) {
            expirationText = (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4px' }}>
                    {activeBatches.map((batch, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'none' }}>
                            {batch.remaining_amount}x do: {batch.expires_at ? new Date(batch.expires_at).toLocaleDateString('sk-SK') : 'Neobmedzene'}
                        </span>
                    ))}
                </div>
            );
        } else if (hasExpired) {
            const expirationDate = new Date(profile.credits_expire_at!);
            expirationText = <div style={{ fontSize: '0.65rem', color: '#ef4444', marginTop: '4px', textTransform: 'none' }}>Vypršalo ({expirationDate.toLocaleDateString('sk-SK')})</div>;
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
