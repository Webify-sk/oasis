import { createClient } from '@/utils/supabase/server';
import { VoucherPurchaseForm } from '@/components/dashboard/VoucherPurchaseForm';
import styles from '@/components/dashboard/VoucherDashboard.module.css';

export default async function GiftVouchersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient();
    const params = await searchParams;
    const showSuccess = params.success === 'true';

    // Fetch active products
    const { data: products } = await supabase
        .from('voucher_products')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

    // Fetch User Profile for billing pre-fill
    const { data: { user } } = await supabase.auth.getUser();
    let userProfile = null;
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        userProfile = data;
    }

    return (
        <div className={styles.container}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", color: '#93745F', marginBottom: '1rem' }}>Darčekové Poukazy</h1>
            <p className={styles.description}>
                Podarujte svojim blízkym zdravie a relax. Vyberte si z našej ponuky darčekových poukazov,
                ktoré im zašleme priamo na email s vaším venovaním.
            </p>

            {showSuccess && (
                <div style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #16A34A',
                    color: '#166534',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '2rem',
                    textAlign: 'center'
                }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        🎉 Platba úspešná!
                    </h3>
                    <p style={{ margin: 0 }}>
                        Ďakujeme za váš nákup. Voucher bol vygenerovaný a odoslaný na email obdarovaného.
                    </p>
                </div>
            )}

            <VoucherPurchaseForm products={products || []} userProfile={userProfile} />
        </div>
    );
}
