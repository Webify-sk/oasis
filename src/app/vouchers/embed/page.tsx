import { createClient } from '@/utils/supabase/server';
import { PublicVoucherList } from '@/components/public/PublicVoucherList';

export const dynamic = 'force-dynamic';

export default async function EmbedVouchersPage() {
    const supabase = await createClient();

    // Fetch Active Voucher Products
    const { data: vouchers, error } = await supabase
        .from('voucher_products')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

    if (error) {
        console.error('Error fetching vouchers:', error);
        return <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Nepodarilo sa načítať darčekové poukazy.</div>;
    }

    return (
        <div style={{ backgroundColor: 'transparent', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <PublicVoucherList vouchers={vouchers || []} />
        </div>
    );
}
