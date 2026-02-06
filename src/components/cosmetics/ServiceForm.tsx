'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { createCosmeticService, updateCosmeticService } from '@/actions/cosmetic-actions';
import styles from '@/app/dashboard/cosmetics/cosmetics.module.css';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface Service {
    id?: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    price: number;
    is_active: boolean;
}

const initialState = {
    message: null as string | null,
};

export function ServiceForm({ initialData }: { initialData?: Service }) {
    // Determine which action to use (create or update)
    // For update, we need to bind the ID
    const action = initialData?.id
        ? updateCosmeticService.bind(null, initialData.id)
        : createCosmeticService;

    const [state, formAction] = useActionState(action, initialState as any);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <Link href="/admin/cosmetics/services" style={{ display: 'inline-flex', alignItems: 'center', color: '#666', textDecoration: 'none', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <ChevronLeft size={16} style={{ marginRight: '0.25rem' }} />
                    Späť na zoznam
                </Link>
                <h1 style={{ fontFamily: 'serif', fontSize: '2rem', color: '#2c3e50', margin: 0 }}>
                    {initialData ? 'Upraviť službu' : 'Nová služba'}
                </h1>
            </div>

            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #E5E0DD', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                {state?.message && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        borderRadius: '6px',
                        backgroundColor: state.message.includes('úspeš') ? '#f0fdf4' : '#fef2f2',
                        color: state.message.includes('úspeš') ? '#166534' : '#991b1b',
                        border: `1px solid ${state.message.includes('úspeš') ? '#bbf7d0' : '#fecaca'}`
                    }}>
                        {state.message}
                    </div>
                )}

                <form action={formAction}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Názov služby</label>
                        <input
                            name="title"
                            defaultValue={initialData?.title}
                            required
                            className={styles.input}
                            placeholder="napr. Masáž tváre"
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Popis</label>
                        <textarea
                            name="description"
                            defaultValue={initialData?.description || ''}
                            // className={styles.textarea}
                            rows={4}
                            placeholder="Krátky popis procedúry..."
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label className={styles.label}>Trvanie (min)</label>
                            <input
                                type="number"
                                name="duration_minutes"
                                defaultValue={initialData?.duration_minutes || 60}
                                required
                                min="5"
                                step="5"
                                // className={styles.input}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                        </div>
                        <div>
                            <label className={styles.label}>Cena (€)</label>
                            <input
                                type="number"
                                name="price"
                                defaultValue={initialData?.price || 0}
                                required
                                min="0"
                                step="0.01"
                                // className={styles.input}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', border: '1px solid #f0f0f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fafafa' }}>
                            <input
                                type="checkbox"
                                name="is_active"
                                id="is_active"
                                defaultChecked={initialData ? initialData.is_active : true}
                                style={{ width: '1.2rem', height: '1.2rem', accentColor: '#5E715D', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#333' }}>
                                Aktívna (zobrazovať v ponuke)
                            </span>
                        </label>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <Link href="/admin/cosmetics/services">
                            <Button type="button" variant="ghost">Zrušiť</Button>
                        </Link>
                        <Button type="submit" style={{ backgroundColor: '#5E715D', color: 'white', padding: '0.75rem 2rem' }}>
                            {initialData ? 'Uložiť zmeny' : 'Vytvoriť službu'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
