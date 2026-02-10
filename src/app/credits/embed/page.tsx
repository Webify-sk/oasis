import { createClient } from '@/utils/supabase/server';
import { PublicCreditPackages } from '@/components/public/PublicCreditPackages';

export const dynamic = 'force-dynamic';

export default async function EmbedCreditPackagesPage() {
    const supabase = await createClient();

    // Fetch Active Credit Packages
    const { data: packages, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

    if (error) {
        console.error('Error fetching packages:', error);
        return <div style={{ color: 'white' }}>Nepodarilo sa načítať balíčky.</div>;
    }

    return (
        <div style={{ backgroundColor: 'transparent', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <PublicCreditPackages packages={packages || []} />
        </div>
    );
}
