import { createClient } from '@/utils/supabase/server';
import { VoucherPurchaseForm } from '@/components/dashboard/VoucherPurchaseForm';
import styles from '@/components/dashboard/VoucherDashboard.module.css';

export default async function GiftVouchersPage() {
    const supabase = await createClient();

    // Fetch active products
    const { data: products } = await supabase
        .from('voucher_products')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Darčekové Poukazy</h1>
            <p className={styles.description}>
                Podarujte svojim blízkym zdravie a relax. Vyberte si z našej ponuky darčekových poukazov,
                ktoré im zašleme priamo na email s vaším venovaním.
            </p>

            <VoucherPurchaseForm products={products || []} />
        </div>
    );
}
