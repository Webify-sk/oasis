'use client';

import { Edit2, Trash2, Calendar, Eye, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
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
    const [expandedSessionKeys, setExpandedSessionKeys] = useState<Set<string>>(new Set());

    const handleDelete = async () => {
        if (!deletingId) return;
        await deleteTrainingType(deletingId);
        setDeletingId(null);
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const toggleSession = (key: string) => {
        const newSet = new Set(expandedSessionKeys);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setExpandedSessionKeys(newSet);
    };

    if (!trainings || trainings.length === 0) {
        // ... (unchanged)
    }

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {trainings.map((training) => (
                <div key={training.id} style={{
                    // ... (unchanged style)
                    backgroundColor: '#fff',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #E5E0DD',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {/* ... (unchanged header content) */}
                        <div>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: 'serif', color: '#4A403A' }}>
                                {training.title}
                            </h3>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#666', flexWrap: 'wrap' }}>
                                <span>{training.level}</span>
                                <span>{training.duration_minutes} min</span>
                                <span style={{ color: '#4A403A', fontWeight: 500 }}>
                                    Prihlásení: {training.bookingCount}
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
                                style={{ height: '32px' }}
                            >
                                {expandedId === training.id ? 'Skryť termíny' : 'Zobraziť termíny'}
                            </Button>

                            <Link href={`/admin/trainings/${training.id}`} style={{ textDecoration: 'none' }}>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        height: '32px',
                                        borderColor: '#E5E0DD',
                                        color: '#4A403A'
                                    }}
                                >
                                    <Eye size={16} />
                                    Detail
                                </Button>
                            </Link>

                            <Button
                                onClick={() => setDeletingId(training.id)}
                                variant="secondary"
                                size="sm"
                                style={{
                                    height: '32px',
                                    width: '32px',
                                    padding: 0,
                                    borderColor: '#fee2e2',
                                    backgroundColor: '#fef2f2',
                                    color: '#991b1b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </div>

                    {/* Sessions List */}
                    {expandedId === training.id && training.upcomingSessions && training.upcomingSessions.length > 0 && (
                        <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px dashed #eee' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#444' }}>Obsadené termíny & Účastníci:</h4>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {training.upcomingSessions.map((session, idx) => {
                                    const sessionKey = `${training.id}-${session.start}`;
                                    const isExpanded = expandedSessionKeys.has(sessionKey);

                                    return (
                                        <div key={idx} style={{ fontSize: '0.85rem', backgroundColor: '#fafafa', padding: '0', borderRadius: '4px', border: '1px solid #eee', overflow: 'hidden' }}>
                                            <div
                                                onClick={() => toggleSession(sessionKey)}
                                                style={{
                                                    padding: '0.75rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    backgroundColor: isExpanded ? '#f5f5f5' : '#fafafa',
                                                    transition: 'background-color 0.2s'
                                                }}
                                            >
                                                <div style={{ fontWeight: 600, color: '#8C7568' }}>
                                                    {new Date(session.start).toLocaleString('sk-SK', { timeZone: 'UTC', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                                    <span style={{ marginLeft: '8px', color: '#666', fontWeight: 400, fontSize: '0.8rem' }}>
                                                        ({session.attendees.length} prihlásených)
                                                    </span>
                                                </div>
                                                <div style={{ color: '#888' }}>
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div style={{ padding: '0 0.75rem 0.75rem 0.75rem', borderTop: '1px solid #eee', marginTop: '-1px' }}>
                                                    <div style={{ paddingTop: '0.5rem' }}>
                                                        {session.attendees.length > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                {session.attendees.map((attendee, i) => (
                                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < session.attendees.length - 1 ? '1px solid #f0f0f0' : 'none', paddingBottom: i < session.attendees.length - 1 ? '4px' : '0' }}>
                                                                        <span style={{ fontWeight: 500, color: '#333' }}>
                                                                            {attendee.full_name || 'Neznámy'}
                                                                        </span>
                                                                        <span style={{ color: '#666', fontSize: '0.8rem' }}>
                                                                            {attendee.email}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontStyle: 'italic', color: '#999' }}>Nikto nie je prihlásený</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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
            {/* Modal code remains same */}

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
