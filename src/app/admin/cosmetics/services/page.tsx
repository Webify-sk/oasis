import { getCosmeticServices } from '@/actions/cosmetic-actions';
import { ServiceManager } from '@/components/cosmetics/ServiceManager';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import styles from '@/components/ui/Button.module.css';

export default async function ServicesPage() {
    const services = await getCosmeticServices();

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", display: 'flex', alignItems: 'center', gap: '1rem', color: '#93745F' }}>
                    Služby
                    <span style={{ fontSize: '1.2rem', backgroundColor: '#f3f4f6', padding: '0.2rem 0.8rem', borderRadius: '999px', color: '#6b7280', fontFamily: 'var(--font-geist-sans)' }}>
                        {services?.length || 0}
                    </span>
                </h1>

                <Link
                    href="/admin/cosmetics/services/new"
                    className={clsx(styles.button, styles.primary, styles.md)}
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <Plus size={18} style={{ marginRight: '0.5rem' }} />
                    PRIDAŤ SLUŽBU
                </Link>
            </div>

            <ServiceManager initialServices={services} />
        </div>
    );
}
