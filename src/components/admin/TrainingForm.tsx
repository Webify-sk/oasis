'use client';

import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Plus, Trash2, Edit2, ChevronDown, Save, ChevronLeft } from 'lucide-react';
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

export function TrainingForm({ trainers, initialData }: { trainers: Trainer[], initialData?: any }) {
    // Initialize with one empty term if no data
    const defaultTerm = {
        id: Date.now(),
        day: 'Pondelok',
        time: '18:00',
        trainer_id: trainers[0]?.id || '',
        active: true,
        isRecurring: true,
        date: ''
    };

    const [terms, setTerms] = useState<any[]>(
        initialData?.schedule?.length > 0 ? initialData.schedule : [defaultTerm]
    );

    // State for new/editing term
    const [editingTermId, setEditingTermId] = useState<number | null>(null);

    const [state, formAction] = useActionState(upsertTrainingType, initialState as any);

    const addTerm = () => {
        setTerms([...terms, {
            id: Date.now(),
            day: 'Pondelok',
            time: '18:00',
            trainer_id: trainers[0]?.id || '',
            active: true,
            isRecurring: true,
            date: ''
        }]);
    };

    const removeTerm = (id: number) => {
        setTerms(terms.filter(t => t.id !== id));
    };

    const updateTerm = (id: number, field: string, value: any) => {
        setTerms(terms.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    // Helper to format date for input (YYYY-MM-DD)
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return dateString.split('T')[0];
    };

    return (
        <form action={formAction} className={styles.formContainer}>
            <input type="hidden" name="schedule" value={JSON.stringify(terms)} />
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
                {/* Header Action could be here */}
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
                    {/* Icon */}
                    Základné informácie
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
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

            {/* TERMS SECTION */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #E5E0DD', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontFamily: 'serif', color: '#4A403A', margin: 0 }}>Termíny</h3>
                    <Button type="button" onClick={addTerm} style={{ backgroundColor: '#5E715D', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                        + PRIDAŤ TERMÍN
                    </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {terms.map((term, index) => (
                        <div key={term.id} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #E5E0DD' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0, fontFamily: 'serif', color: '#4A403A' }}>Termín {index + 1}</h4>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{
                                        backgroundColor: term.active ? '#5E715D' : '#ccc',
                                        color: '#fff',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer'
                                    }} onClick={() => updateTerm(term.id, 'active', !term.active)}>
                                        {term.active ? 'Aktívny' : 'Neaktívny'}
                                    </span>
                                    <button type="button" onClick={() => removeTerm(term.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#8C4848' }}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div>
                                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>Typ:</label>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    checked={term.isRecurring !== false} // Default to true if undefined
                                                    onChange={() => updateTerm(term.id, 'isRecurring', true)}
                                                />
                                                Opakovaný (Každý týždeň)
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    checked={term.isRecurring === false}
                                                    onChange={() => updateTerm(term.id, 'isRecurring', false)}
                                                />
                                                Jednorazový (Dátum)
                                            </label>
                                        </div>
                                    </div>

                                    {term.isRecurring !== false ? (
                                        <>
                                            <label className={styles.label}>Deň</label>
                                            <div className={styles.selectWrapper}>
                                                <select
                                                    value={term.day}
                                                    onChange={(e) => updateTerm(term.id, 'day', e.target.value)}
                                                    className={`${styles.input} ${styles.select}`}
                                                >
                                                    <option value="Pondelok">Pondelok</option>
                                                    <option value="Utorok">Utorok</option>
                                                    <option value="Streda">Streda</option>
                                                    <option value="Štvrtok">Štvrtok</option>
                                                    <option value="Piatok">Piatok</option>
                                                    <option value="Sobota">Sobota</option>
                                                    <option value="Nedeľa">Nedeľa</option>
                                                </select>
                                                <ChevronDown size={16} className={styles.selectIcon} />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <label className={styles.label}>Dátum</label>
                                            <input
                                                type="date"
                                                value={formatDate(term.date)}
                                                onChange={(e) => updateTerm(term.id, 'date', e.target.value)}
                                                className={styles.input}
                                                style={{ width: '100%', boxSizing: 'border-box' }}
                                            />
                                        </>
                                    )}

                                    <label className={styles.label}>Čas začiatku</label>
                                    <input
                                        type="time"
                                        value={term.time.replace(/ - .*/, '')}
                                        onChange={(e) => updateTerm(term.id, 'time', e.target.value)}
                                        className={styles.input}
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label className={styles.label}>Tréner</label>
                                    <div className={styles.selectWrapper}>
                                        <select
                                            value={term.trainer_id}
                                            onChange={(e) => updateTerm(term.id, 'trainer_id', e.target.value)}
                                            className={`${styles.input} ${styles.select}`}
                                        >
                                            <option value="">Vyberte trénera</option>
                                            {trainers.map(t => (
                                                <option key={t.id} value={t.id}>{t.full_name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className={styles.selectIcon} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="submit" style={{ backgroundColor: '#8C4848', color: '#fff', padding: '1rem 3rem', fontSize: '1rem' }}>
                        ULOŽIŤ ZMENY
                    </Button>
                </div>
            </div>
        </form >
    );
}
