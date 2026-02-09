import { getCreditPackages } from '@/app/admin/credits/actions';
import { CreditPackageList } from '@/components/admin/CreditPackageList';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import styles from '@/components/ui/Button.module.css';

export default async function AdminCreditsPage() {
    const packages = await getCreditPackages();

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: 'serif' }}>Kreditné balíky</h1>

                <Link
                    href="/admin/credits/new"
                    className={clsx(styles.button, styles.primary, styles.md)}
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <Plus size={18} style={{ marginRight: '0.5rem' }} />
                    NOVÝ BALÍK
                </Link>
            </div>

            <div style={{ padding: '0 2rem' }}>
                <CreditPackageList packages={packages} />
            </div>
        </div>
    );
}
