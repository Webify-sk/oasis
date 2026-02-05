'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { createCosmeticService, updateCosmeticService, deleteCosmeticService } from '@/actions/cosmetic-actions';
import styles from '@/app/dashboard/cosmetics/cosmetics.module.css';

interface Service {
    id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    price: number;
    is_active: boolean;
}

import { useUserRole } from '@/hooks/useUserRole';

// ...

export function ServiceManager({ initialServices }: { initialServices: Service[] }) {
    const { role } = useUserRole();
    const [services, setServices] = useState<Service[]>(initialServices);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(false);

    // ... handlers ...

    const handleCreate = async (formData: FormData) => {
        setLoading(true);
        await createCosmeticService(formData);
        setLoading(false);
        setIsModalOpen(false);
        window.location.reload();
    };

    const handleUpdate = async (formData: FormData) => {
        if (!editingService) return;
        setLoading(true);
        await updateCosmeticService(editingService.id, formData);
        setLoading(false);
        setEditingService(null);
        window.location.reload();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Naozaj chcete vymazať túto službu?')) {
            await deleteCosmeticService(id);
            window.location.reload();
        }
    };

    const openCreateModal = () => {
        setEditingService(null);
        setIsModalOpen(true);
    };

    const openEditModal = (service: Service) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '500', color: '#333' }}>Zoznam služieb ({services.length})</h2>
                {role === 'admin' && (
                    <button
                        onClick={openCreateModal}
                        className={styles.primaryButton}
                    >
                        <Plus size={18} />
                        Pridať službu
                    </button>
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
                                        <button
                                            onClick={() => openEditModal(service)}
                                            className={`${styles.actionButton} ${styles.editBtn}`}
                                            title="Upraviť"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(service.id)}
                                            className={`${styles.actionButton} ${styles.deleteBtn}`}
                                            title="Vymazať"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {(isModalOpen || editingService) && role === 'admin' && (
                <div className={styles.modalOverlay} onClick={() => { setIsModalOpen(false); setEditingService(null); }}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => { setIsModalOpen(false); setEditingService(null); }}
                            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '0.5rem' }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ marginTop: 0, marginBottom: '2rem', fontFamily: 'var(--font-heading, serif)', fontSize: '1.8rem', color: '#2c3e50' }}>
                            {editingService ? 'Upraviť službu' : 'Nová služba'}
                        </h2>

                        <form action={editingService ? handleUpdate : handleCreate}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Názov služby</label>
                                <input
                                    name="title"
                                    defaultValue={editingService?.title}
                                    required
                                    className={styles.input}
                                    placeholder="napr. Masáž tváre"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Popis</label>
                                <textarea
                                    name="description"
                                    defaultValue={editingService?.description || ''}
                                    className={styles.textarea}
                                    rows={3}
                                    placeholder="Krátky popis procedúry..."
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label className={styles.label}>Trvanie (min)</label>
                                    <input
                                        type="number"
                                        name="duration_minutes"
                                        defaultValue={editingService?.duration_minutes}
                                        required
                                        min="5"
                                        step="5"
                                        className={styles.input}
                                    />
                                </div>
                                <div>
                                    <label className={styles.label}>Cena (€)</label>
                                    <input
                                        type="number"
                                        name="price"
                                        defaultValue={editingService?.price}
                                        required
                                        min="0"
                                        step="0.01"
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', border: '1px solid #f0f0f0', borderRadius: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        id="is_active"
                                        defaultChecked={editingService ? editingService.is_active : true}
                                        style={{ width: '1.2rem', height: '1.2rem', accentColor: '#5E715D' }}
                                    />
                                    <label htmlFor="is_active" style={{ cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 }}>
                                        Aktívna (zobrazovať v ponuke)
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={styles.primaryButton}
                                style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '1rem' }}
                            >
                                {loading ? 'Ukladám...' : (editingService ? 'Uložiť zmeny' : 'Vytvoriť službu')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
