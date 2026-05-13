'use client';

import { useState, useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { upsertTrainingType } from '@/app/admin/trainings/actions';
import styles from './TrainingForm.module.css';

interface Trainer {
    id: string;
    full_name: string;
}

const initialState: { message: string | null, inputs: any } = {
    message: null,
    inputs: null,
};

export function TrainingForm({ trainers, initialData, schedule }: { trainers: Trainer[], initialData?: any, schedule?: any[] }) {
    const [state, formAction] = useActionState(upsertTrainingType, initialState as any);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <form action={formAction} className={styles.formContainer} id="training-form">
            <input type="hidden" name="schedule" value={JSON.stringify(schedule || [])} />
            {initialData?.id && <input type="hidden" name="id" value={initialData.id} />}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/admin/trainings" style={{ color: '#4A403A', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={24} />
                    </Link>
                    <h2 style={{ fontSize: '1.5rem', fontFamily: 'serif', color: '#4A403A', margin: 0 }}>
                        {initialData ? initialData.title : 'Nový tréning'}
                    </h2>
                </div>
            </div>

            {
                state?.message && (
                    <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#dc2626', marginBottom: '1rem', borderRadius: '4px' }}>
                        {state.message}
                    </div>
                )
            }

            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', border: '1px solid #E5E0DD' }}>
                <h3 style={{ fontSize: '1.1rem', fontFamily: 'serif', color: '#4A403A', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Základné informácie
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '1rem' : '2rem' }}>
                    {/* Left Column */}
                    <div>
                        <label className={styles.label}>Názov</label>
                        <input name="title" required defaultValue={state?.inputs?.title ?? initialData?.title} className={styles.input} placeholder="napr. Pilates Flow" />

                        <label className={styles.label}>Max. počet účastníkov</label>
                        <input name="capacity" type="number" defaultValue={(state?.inputs?.capacity ?? initialData?.capacity) || 8} className={styles.input} />

                        <label className={styles.label}>Dĺžka tréningu</label>
                        <input name="duration_minutes" defaultValue={state?.inputs?.duration_minutes ?? initialData?.duration_minutes} className={styles.input} placeholder="50-80 minut" />

                        <label className={styles.label}>Opis tréningu</label>
                        <textarea name="description" rows={6} defaultValue={state?.inputs?.description ?? initialData?.description} className={`${styles.input} ${styles.textarea}`} />
                        <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#999', marginTop: '0.25rem' }}>87/200</div>

                        <label className={styles.label} style={{ marginTop: '1rem' }}>Cena (kredity)</label>
                        <input name="price_credits" type="number" min="0" defaultValue={(state?.inputs?.price_credits ?? initialData?.price_credits) ?? 1} className={styles.input} />
                    </div>

                    {/* Right Column */}
                    <div>
                        <label className={styles.label}>Úroveň</label>
                        <div className={styles.selectWrapper}>
                            <select name="level" defaultValue={(state?.inputs?.level ?? initialData?.level) || 'Všetky úrovne'} className={`${styles.input} ${styles.select}`}>
                                <option value="Začiatočník">Začiatočník</option>
                                <option value="Pokročilý">Pokročilý</option>
                                <option value="Všetky úrovne">Všetky úrovne</option>
                            </select>
                            <ChevronDown size={16} className={styles.selectIcon} />
                        </div>

                        <label className={styles.label}>Svalová partia</label>
                        <input name="muscle_group" defaultValue={state?.inputs?.muscle_group ?? initialData?.muscle_group} className={styles.input} />

                        <label className={styles.label} style={{ marginTop: '7.8rem' }}>Perex</label>
                        <textarea name="perex" rows={6} defaultValue={state?.inputs?.perex ?? initialData?.perex} className={`${styles.input} ${styles.textarea}`} />
                        <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#999', marginTop: '0.25rem' }}>87/100</div>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit">
                    {initialData ? 'Uložiť zmeny' : 'Vytvoriť tréning'}
                </Button>
            </div>
        </form>
    );
}
