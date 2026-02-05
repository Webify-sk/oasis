'use client';

import { Edit2, Trash2, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { deleteTrainingType } from '@/app/admin/trainings/actions';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface Attendee {
    full_name: string | null;
    email: string | null;
}

interface TrainingSession {
    start: string;
    attendees: Attendee[];
}

interface TrainingType {
    id: string;
    title: string;
    description: string;
    capacity: number;
    duration_minutes: string;
    level: string;
    schedule: any[]; // JSONB
    bookingCount?: number;
    upcomingSessions?: TrainingSession[];
}

export function TrainingList({ trainings }: { trainings: TrainingType[] }) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!deletingId) return;
        await deleteTrainingType(deletingId);
        setDeletingId(null);
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
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
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: 'serif', color: '#4A403A' }}>
                                {training.title}
                            </h3>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#666', flexWrap: 'wrap' }}>
                                <span>{training.level}</span>
                                <span>{training.duration_minutes} min</span>
                                <span style={{ color: '#4A403A', fontWeight: 500 }}>
                                    Prihlásení: {training.bookingCount} (budúce)
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center' }}>
                                    <Calendar size={14} style={{ marginRight: '0.25rem' }} />
                                    {training.schedule?.length || 0} termínov/týždeň
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpand(training.id)}
                            >
                                {expandedId === training.id ? 'Skryť termíny' : 'Zobraziť termíny'}
                            </Button>

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

                    {/* Sessions List - Expanded or if sessions exist? Let's use expand. */}
                    {expandedId === training.id && training.upcomingSessions && training.upcomingSessions.length > 0 && (
                        <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px dashed #eee' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#444' }}>Obsadené termíny & Účastníci:</h4>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {training.upcomingSessions.map((session, idx) => (
                                    <div key={idx} style={{ fontSize: '0.85rem', backgroundColor: '#fafafa', padding: '0.5rem', borderRadius: '4px' }}>
                                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                                            {new Date(session.start).toLocaleString('sk-SK', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ color: '#666' }}>
                                            {session.attendees.length > 0
                                                ? session.attendees.map(a => a.full_name || a.email).join(', ')
                                                : <span style={{ fontStyle: 'italic' }}>Nikto</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {expandedId === training.id && (!training.upcomingSessions || training.upcomingSessions.length === 0) && (
                        <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px dashed #eee', color: '#999', fontStyle: 'italic', fontSize: '0.9rem' }}>
                            Žiadne nadchádzajúce rezervácie.
                        </div>
                    )}
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
