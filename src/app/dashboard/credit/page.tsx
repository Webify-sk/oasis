import { createClient } from '@/utils/supabase/server'; // Add import
import { CreditPackages } from '@/components/dashboard/CreditPackages';
import { CreditCounter } from '@/components/dashboard/CreditCounter';
import { VoucherRedemption } from '@/components/dashboard/VoucherRedemption';
import styles from '../trainings/page.module.css';
import { getActiveCreditPackages } from '@/app/admin/credits/actions';

interface CreditPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CreditPage({ searchParams }: CreditPageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const packages = await getActiveCreditPackages();

    // Fetch profile for billing details
    let userProfile = null;
    if (user) {
        const { data } = await supabase
            .from('profiles')
            .select('*') // Simplify to select all for now to get billing cols
            .eq('id', user.id)
            .single();
        userProfile = data;
    }

    const params = await searchParams;
    const success = params?.success === 'true';
    const canceled = params?.canceled === 'true';

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: 'serif' }}>Dobiť vstupy</h1>

                <CreditCounter />
            </div>

            {success && (
                <div style={{
                    margin: '0 2rem 2rem 2rem',
                    padding: '1rem',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #059669',
                    borderRadius: '8px',
                    color: '#065f46'
                }}>
                    <strong>Úspešné!</strong> Vaša objednávka bola prijatá. Vstupy budú čoskoro pripísané.
                </div>
            )}

            {canceled && (
                <div style={{
                    margin: '0 2rem 2rem 2rem',
                    padding: '1rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #dc2626',
                    borderRadius: '8px',
                    color: '#991b1b'
                }}>
                    Objednávka bola zrušená.
                </div>
            )}

            <div style={{ padding: '0 2rem 4rem 2rem' }}>
                <CreditPackages userProfile={userProfile} packages={packages} />
                <div style={{ marginTop: '3rem', maxWidth: '600px' }}>
                    <VoucherRedemption />
                </div>
            </div>
        </div>
    );
}
