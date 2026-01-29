'use client';

import { Edit2, Trash2, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { deleteTrainingType } from '@/app/admin/trainings/actions';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface TrainingType {
    id: string;
    title: string;
    description: string;
    capacity: number;
    duration_minutes: string;
    level: string;
    schedule: any[]; // JSONB
    bookingCount?: number;
}

export function TrainingList({ trainings }: { trainings: TrainingType[] }) {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!deletingId) return;
        await deleteTrainingType(deletingId);
        setDeletingId(null);
    };

    if (!trainings || trainings.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                Zatiaľ nie sú vytvorené žiadne tréningy.
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {trainings.map((training) => (
                <div key={training.id} style={{
                    backgroundColor: '#fff',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #E5E0DD',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: 'serif', color: '#4A403A' }}>
                            {training.title}
                        </h3>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#666' }}>
                            <span>{training.level}</span>
                            <span>{training.duration_minutes}</span>
                            <span style={{ color: '#4A403A', fontWeight: 500 }}>Prihlásení: {training.bookingCount} (celkovo)</span>
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                                <Calendar size={14} style={{ marginRight: '0.25rem' }} />
                                {training.schedule?.length || 0} termínov
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link href={`/admin/trainings/${training.id}`} style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid #E5E0DD',
                            borderRadius: '4px',
                            color: '#4A403A',
                            display: 'flex',
                            alignItems: 'center',
                            textDecoration: 'none',
                            fontSize: '0.85rem'
                        }}>
                            <Edit2 size={16} style={{ marginRight: '0.5rem' }} />
                            Upraviť
                        </Link>

                        <button
                            onClick={() => setDeletingId(training.id)}
                            style={{
                                padding: '0.5rem',
                                border: '1px solid #fee2e2',
                                backgroundColor: '#fef2f2',
                                borderRadius: '4px',
                                color: '#991b1b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}

            <Modal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                title="Vymazať tréning"
                actions={
                    <>
                        <Button variant="ghost" onClick={() => setDeletingId(null)}>
                            Zrušiť
                        </Button>
                        <Button variant="primary" style={{ backgroundColor: '#991b1b', borderColor: '#991b1b' }} onClick={handleDelete}>
                            Vymazať
                        </Button>
                    </>
                }
            >
                <p>Naozaj chcete vymazať tento tréning? Táto akcia je nevratná.</p>
            </Modal>
        </div>
    );
}
