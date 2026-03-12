'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { deleteCosmeticService, reorderCosmeticServices } from '@/actions/cosmetic-actions';
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
    category?: string;
    display_order?: number;
}

export function ServiceManager({ initialServices }: { initialServices: Service[] }) {
    const { role } = useUserRole();
    const [services, setServices] = useState<Service[]>(initialServices);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReordering, setIsReordering] = useState(false);

    // Filter services by category and sort them by display_order
    const faceServices = services.filter(s => s.category === 'beauty').sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const bodyServices = services.filter(s => s.category === 'body').sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

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

    const handleReorder = async (serviceId: string, categoryServices: Service[], direction: 'up' | 'down') => {
        const index = categoryServices.findIndex(s => s.id === serviceId);
        if (index < 0) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === categoryServices.length - 1) return;

        const newServices = [...categoryServices];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap
        const temp = newServices[index];
        newServices[index] = newServices[swapIndex];
        newServices[swapIndex] = temp;

        // Update display_order based on new array position
        const updates = newServices.map((s, idx) => ({
            id: s.id,
            display_order: idx
        }));

        // Optimistically update local state
        const remainingServices = services.filter(s => s.category !== newServices[0].category);
        setServices([...remainingServices, ...updates.map(u => ({ ...newServices.find(s => s.id === u.id)!, display_order: u.display_order }))]);

        setIsReordering(true);
        try {
            const res = await reorderCosmeticServices(updates);
            if (res?.error) {
                alert('Chyba pri zmene poradia.');
                // Revert local state (could just reload here)
                window.location.reload();
            }
        } catch (e) {
            console.error(e);
            alert('Chyba pri zmene poradia.');
        } finally {
            setIsReordering(false);
        }
    };

    const renderServiceCard = (service: Service, categoryServices: Service[], index: number) => (
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
                    <div className={styles.duration} style={{ textTransform: 'capitalize' }}>
                        <span>{service.category === 'body' ? 'Body (Telo)' : 'Face (Kozmetika)'}</span>
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
                            <div style={{ display: 'flex', gap: '2px', marginRight: '0.5rem' }}>
                                <Button
                                    onClick={() => handleReorder(service.id, categoryServices, 'up')}
                                    disabled={isReordering || index === 0}
                                    variant="secondary"
                                    size="sm"
                                    style={{ padding: '0 4px', height: '32px', minWidth: '32px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', color: '#4b5563' }}
                                    title="Posunúť vyššie"
                                >
                                    ↑
                                </Button>
                                <Button
                                    onClick={() => handleReorder(service.id, categoryServices, 'down')}
                                    disabled={isReordering || index === categoryServices.length - 1}
                                    variant="secondary"
                                    size="sm"
                                    style={{ padding: '0 4px', height: '32px', minWidth: '32px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', color: '#4b5563' }}
                                    title="Posunúť nižšie"
                                >
                                    ↓
                                </Button>
                            </div>
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
    );

    return (
        <div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', marginTop: '2rem', color: '#4b5563', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Face (Kozmetika)</h2>
            <div className={styles.grid}>
                {faceServices.map((service, index) => renderServiceCard(service, faceServices, index))}
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', marginTop: '3rem', color: '#4b5563', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Body (Telo)</h2>
            <div className={styles.grid}>
                {bodyServices.map((service, index) => renderServiceCard(service, bodyServices, index))}
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
