import { Zap, Settings, Users, Calendar, Plus, Clock, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './cosmetics.module.css';
import { ServiceManager } from '@/components/cosmetics/ServiceManager';

export default async function CosmeticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let isEmployeeOrAdmin = false;
    let activeServicesCount = 0;
    let services: any[] = [];

    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        isEmployeeOrAdmin = profile?.role === 'employee' || profile?.role === 'admin';

        if (isEmployeeOrAdmin) {
            const { getManagedServices } = await import('@/actions/cosmetic-actions');
            services = await getManagedServices();
            activeServicesCount = services.length;
        }
    }

    if (!isEmployeeOrAdmin) {
        const { getCosmeticServices } = await import('@/actions/cosmetic-actions');
        services = await getCosmeticServices();
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Beauty & Body</p>
                    <h1 style={{ fontSize: '2.5rem', fontFamily: "var(--font-heading)", color: '#93745F', margin: 0 }}>
                        {isEmployeeOrAdmin ? 'Správa Kozmetiky' : 'Naša Ponuka'}
                    </h1>
                </div>
                {/* Employee Actions now handled via ServiceManager or removed if not needed since Manager is inline */}
            </div>

            {/* Stats Cards - Only for Employees/Admins */}
            {isEmployeeOrAdmin && (
                <>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '3rem'
                    }}>
                        <div style={{
                            padding: '1.5rem',
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                            border: '1px solid #eee'
                        }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#5E715D', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dnešné rezervácie</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2c3e50' }}>-</div>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#95a5a6' }}>Prehľad dňa</p>
                        </div>

                        <div style={{
                            padding: '1.5rem',
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                            border: '1px solid #eee'
                        }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#5E715D', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aktívne služby</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2c3e50' }}>{activeServicesCount}</div>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#95a5a6' }}>Dostupné pre klientov</p>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.8rem', fontFamily: "var(--font-heading)", color: '#93745F', marginBottom: '1.5rem' }}>Moje služby</h2>
                        <ServiceManager initialServices={services} />
                    </div>
                </>
            )}

            {/* Client View: Services List */}
            {!isEmployeeOrAdmin && (
                <div>
                    <div className={styles.grid}>
                        {services.map((service) => (
                            <div key={service.id} className={styles.card}>
                                {/* Decor header */}
                                <div className={styles.cardDecor}></div>

                                <div className={styles.cardContent}>
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.cardTitle}>{service.title}</h3>
                                        <div className={styles.cardPrice}>{service.price} €</div>
                                    </div>

                                    {service.description && (
                                        <p className={styles.description}>
                                            {service.description}
                                        </p>
                                    )}

                                    <div className={styles.cardFooter}>
                                        <div className={styles.metaRow}>
                                            <div className={styles.duration}>
                                                <Clock size={14} />
                                                <span>{service.duration_minutes} min</span>
                                            </div>
                                        </div>

                                        <Link href={`/dashboard/cosmetics/book?serviceId=${service.id}`} style={{ display: 'block' }}>
                                            <button className={styles.bookButton}>
                                                Rezervovať termín
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {services.length === 0 && (
                        <div className={styles.emptyState}>
                            <div className={styles.iconCircle}>
                                <Sparkles size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.2rem', color: '#333', marginBottom: '0.5rem' }}>Žiadne služby</h3>
                            <p>Momentálne nie sú k dispozícii žiadne služby.</p>
                        </div>
                    )}


                </div>
            )}
        </div>
    );
}
