import { createClient } from '@/utils/supabase/server';
import { PublicVoucherList } from '@/components/public/PublicVoucherList';
import { EmbedAutoHeight } from '@/components/public/EmbedAutoHeight';

export const dynamic = 'force-dynamic';

export default async function EmbedVouchersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient();
    const params = await searchParams;
    const showSuccess = params.success === 'true';
    const showCanceled = params.canceled === 'true';

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
        // No min-height here: with 100vh the page would always be as tall as the frame and
        // the frame could never shrink back (e.g. from the purchase form to the list).
        <EmbedAutoHeight>
            <PublicVoucherList
                vouchers={vouchers || []}
                success={showSuccess}
                canceled={showCanceled}
            />
        </EmbedAutoHeight>
    );
}
