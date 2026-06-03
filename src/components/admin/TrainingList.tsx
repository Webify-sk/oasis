'use client';

import { Edit2, Trash2, Calendar, Eye, ChevronDown, ChevronUp, ChevronRight, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { deleteTrainingType } from '@/app/admin/trainings/actions';
import { cancelBooking, rescheduleBooking } from '@/app/dashboard/trainings/actions';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';

interface Attendee {
    booking_id?: string;
    full_name: string | null;
    email: string | null;
    participants_count?: number;
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

export function TrainingList({ trainings, scheduleData = [] }: { trainings: TrainingType[], scheduleData?: any[] }) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedSessionKeys, setExpandedSessionKeys] = useState<Set<string>>(new Set());

    // Reschedule & Cancel States
    const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
    const [bookingToReschedule, setBookingToReschedule] = useState<string | null>(null);
    const [selectedNewSession, setSelectedNewSession] = useState<any | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [toastState, setToastState] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

    const confirmCancel = async () => {
        if (!bookingToCancel) return;
        const id = bookingToCancel;
        setBookingToCancel(null);
        setLoadingId(id);

        try {
            const res = await cancelBooking(id);
            if (!res.success) {
                setToastState({ message: res.message, type: 'error' });
            } else {
                setToastState({ message: 'Rezervácia bola úspešne zrušená.', type: 'success' });
            }
        } catch (error) {
            setToastState({ message: 'Chyba pri rušení rezervácie.', type: 'error' });
        } finally {
            setLoadingId(null);
        }
    };

    const confirmReschedule = async () => {
        if (!bookingToReschedule || !selectedNewSession) return;
        const id = bookingToReschedule;
        
        // Find participants_count for the booking
        let participantsCount = 1;
        trainings.forEach(t => {
            t.upcomingSessions?.forEach(s => {
                const attendee = s.attendees.find(a => a.booking_id === id);
                if (attendee) participantsCount = attendee.participants_count || 1;
            });
        });

        setBookingToReschedule(null);
        setLoadingId(id);

        try {
            const res = await rescheduleBooking(
                id,
                selectedNewSession.trainingTypeId,
                selectedNewSession.startTimeISO,
                participantsCount
            );
            if (!res.success) {
                setToastState({ message: res.message, type: 'error' });
            } else {
                setToastState({ message: 'Termín bol úspešne zmenený.', type: 'success' });
            }
        } catch (error) {
            setToastState({ message: 'Chyba pri zmene termínu.', type: 'error' });
        } finally {
            setLoadingId(null);
        }
    };

    if (!trainings || trainings.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E0DD' }}>
                Zatiaľ neboli pridané žiadne tréningy.
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
                                                        ({session.attendees.reduce((total, a) => total + (a.participants_count || 1), 0)} prihlásených)
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
                                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <span style={{ fontWeight: 500, color: '#333' }}>
                                                                                {attendee.full_name || 'Neznámy'}
                                                                                {(attendee.participants_count || 1) > 1 && (
                                                                                    <span style={{ color: '#8C7568', marginLeft: '6px', fontWeight: 600 }}>
                                                                                        (+{(attendee.participants_count || 1) - 1})
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                            <span style={{ color: '#666', fontSize: '0.8rem' }}>
                                                                                {attendee.email}
                                                                            </span>
                                                                        </div>
                                                                        
                                                                        {attendee.booking_id && (
                                                                            <div style={{ display: 'flex', gap: '0.25rem', opacity: loadingId === attendee.booking_id ? 0.5 : 1 }}>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setBookingToReschedule(attendee.booking_id!); setSelectedNewSession(null); }}
                                                                                    disabled={loadingId === attendee.booking_id}
                                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '0.25rem' }}
                                                                                    title="Zmeniť termín"
                                                                                >
                                                                                    <Pencil size={14} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setBookingToCancel(attendee.booking_id!); }}
                                                                                    disabled={loadingId === attendee.booking_id}
                                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.25rem' }}
                                                                                    title="Zrušiť rezerváciu"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </div>
                                                                        )}
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

            {/* Cancel Booking Modal */}
            <Modal
                isOpen={!!bookingToCancel}
                onClose={() => setBookingToCancel(null)}
                title="Zrušiť rezerváciu"
                actions={
                    <>
                        <Button variant="outline" onClick={() => setBookingToCancel(null)}>Ponechať</Button>
                        <Button onClick={confirmCancel} style={{ backgroundColor: '#DC2626', color: 'white' }}>Áno, zrušiť</Button>
                    </>
                }
            >
                <p>Naozaj chcete zrušiť túto rezerváciu klienta? <br/>Kredity mu budú štandardne vrátené podľa pravidiel (v prípade admina bez ohľadu na 12h limit).</p>
            </Modal>

            {/* Reschedule Booking Modal */}
            <Modal
                isOpen={!!bookingToReschedule}
                onClose={() => setBookingToReschedule(null)}
                title="Zmeniť termín"
            >
                <div style={{ padding: '0.5rem 0' }}>
                    <p style={{ marginBottom: '1rem', fontWeight: 600, color: '#374151' }}>Vyberte si nový termín z ponuky:</p>
                    
                    <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
                        {scheduleData.map(day => {
                            const availableSessions = day.sessions.filter((s: any) => 
                                !s.isPast && 
                                s.occupancy.current < s.occupancy.max
                            );

                            if (availableSessions.length === 0) return null;

                            return (
                                <div key={day.date}>
                                    <h5 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#6B7280', marginBottom: '0.5rem' }}>{day.date}</h5>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {availableSessions.map(session => (
                                            <div 
                                                key={session.id}
                                                onClick={() => setSelectedNewSession(session)}
                                                style={{
                                                    padding: '0.75rem',
                                                    border: `1px solid ${selectedNewSession?.id === session.id ? '#5E715D' : '#E5E7EB'}`,
                                                    backgroundColor: selectedNewSession?.id === session.id ? '#F0F5F0' : '#FFFFFF',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1F2937' }}>{session.name}</div>
                                                    <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>{session.time} • {session.trainer}</div>
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: '#5E715D', fontWeight: 500 }}>
                                                    {session.occupancy.max - session.occupancy.current} voľných miest
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                        <Button variant="outline" onClick={() => setBookingToReschedule(null)}>Zrušiť</Button>
                        <Button 
                            onClick={confirmReschedule} 
                            disabled={!selectedNewSession}
                            style={{ backgroundColor: '#5E715D', color: 'white', opacity: selectedNewSession ? 1 : 0.5 }}
                        >
                            Potvrdiť zmenu
                        </Button>
                    </div>
                </div>
            </Modal>

            {toastState && (
                <Toast 
                    message={toastState.message} 
                    type={toastState.type} 
                    onClose={() => setToastState(null)} 
                />
            )}
        </div>
    );
}
