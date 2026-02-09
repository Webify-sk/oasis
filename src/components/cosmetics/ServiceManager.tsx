'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { deleteCosmeticService } from '@/actions/cosmetic-actions';
import styles from '@/app/dashboard/cosmetics/cosmetics.module.css';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useUserRole } from '@/hooks/useUserRole';
import { Modal } from '@/components/ui/Modal';

interface Service {
    id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    price: number;
    is_active: boolean;
}

export function ServiceManager({ initialServices }: { initialServices: Service[] }) {
    const { role } = useUserRole();
    const [services, setServices] = useState<Service[]>(initialServices);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await deleteCosmeticService(deleteId);
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('Chyba pri mazaní.');
            setIsDeleting(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '500', color: '#333' }}>Zoznam služieb ({services.length})</h2>
                {role === 'admin' && (
                    <Link href="/admin/cosmetics/services/new">
                        <button className={styles.primaryButton}>
                            <Plus size={18} />
                            Pridať službu
                        </button>
                    </Link>
                )}
            </div>

            <div className={styles.grid}>
                {services.map((service) => (
                    <div key={service.id} className={styles.card}>
                        <div className={styles.cardDecor} />

                        <div className={styles.cardContent}>
                            <div className={styles.cardHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <h3 className={styles.cardTitle}>{service.title}</h3>
                                    {!service.is_active && (
                                        <span className={`${styles.statusBadge} ${styles.statusInactive}`}>
                                            Neaktívna
                                        </span>
                                    )}
                                </div>
                                <span className={styles.cardPrice}>
                                    {service.price} €
                                </span>
                            </div>

                            <p className={styles.description}>
                                {service.description || 'Bez popisu'}
                            </p>

                            <div className={styles.metaRow}>
                                <div className={styles.duration}>
                                    <Clock size={14} />
                                    <span>{service.duration_minutes} min</span>
                                </div>
                            </div>

                            <div className={styles.cardFooter}>
                                <span style={{ fontSize: '0.85rem', color: '#999' }}>
                                    {service.is_active
                                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#166534' }}><CheckCircle size={12} /> Aktívna</span>
                                        : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> Skrytá</span>}
                                </span>
                                {role === 'admin' && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Link href={`/admin/cosmetics/services/${service.id}`} style={{ textDecoration: 'none' }}>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                style={{
                                                    fontSize: '0.75rem',
                                                    height: '32px',
                                                    backgroundColor: 'transparent',
                                                    border: '1px solid #E5E7EB',
                                                    color: '#4B5563',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    boxShadow: 'none',
                                                    padding: '0 0.8rem'
                                                }}
                                            >
                                                <Eye size={14} />
                                                Detail
                                            </Button>
                                        </Link>
                                        <Button
                                            onClick={() => handleDeleteClick(service.id)}
                                            variant="primary"
                                            size="sm"
                                            style={{
                                                backgroundColor: '#8C4848',
                                                height: '32px',
                                                width: '32px',
                                                padding: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Vymazať"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                title="Zmazať službu"
                actions={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteId(null)} disabled={isDeleting}>
                            Zrušiť
                        </Button>
                        <Button
                            variant="primary"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            style={{ backgroundColor: '#dc2626', color: 'white' }}
                        >
                            {isDeleting ? 'Mažem...' : 'Zmazať'}
                        </Button>
                    </>
                }
            >
                <p>Naozaj chcete vymazať túto službu? Táto akcia je nevratná.</p>
            </Modal>
        </div>
    );
}
