
import { createClient } from '@/utils/supabase/server';
import { GuestVoucherForm } from '@/components/dashboard/GuestVoucherForm';

export default async function PublicVoucherPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient();
    const params = await searchParams;
    const preselectedId = typeof params.productId === 'string' ? params.productId : undefined;

    const { data: products } = await supabase
        .from('voucher_products')
        .select('*')
        .eq('is_active', true)
        .order('price');

    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '2rem 1rem',
            fontFamily: 'var(--font-geist-sans)'
        }}>
            <header style={{
                textAlign: 'center',
                marginBottom: '3rem',
                marginTop: '1rem'
            }}>
                <h1 style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: '2.5rem',
                    color: '#93745F',
                    marginBottom: '0.5rem'
                }}>Darujte Radosť</h1>
                <p style={{
                    color: '#666',
                    fontSize: '1.1rem'
                }}>Vyberte si darčekový poukaz do Oasis Lounge.</p>

                <div style={{ marginTop: '1rem' }}>
                    <a href="/" style={{ color: '#8C7568', textDecoration: 'underline', fontSize: '0.9rem' }}>
                        &larr; Späť na úvod
                    </a>
                </div>
            </header>

            <GuestVoucherForm products={products || []} preselectedId={preselectedId} />

            <footer style={{
                textAlign: 'center',
                marginTop: '4rem',
                paddingTop: '2rem',
                borderTop: '1px solid #eee',
                color: '#999',
                fontSize: '0.85rem'
            }}>
                <p>&copy; {new Date().getFullYear()} Oasis Lounge. Všetky práva vyhradené.</p>
            </footer>
        </div>
    );
}
