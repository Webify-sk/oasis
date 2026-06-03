'use client';

import { useState } from 'react';
import { Calendar, Clock, XCircle, Edit } from 'lucide-react';
import { cancelBooking, rescheduleBooking } from '@/app/dashboard/trainings/actions';
import { Toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import styles from './MyBookings.module.css';

interface MyBooking {
    id: string;
    start_time: string;
    participants_count?: number;
    training_type: {
        title: string;
        level: string;
    } | any;
}

interface ScheduleSession {
    id: string;
    trainingTypeId: string;
    startTimeISO: string;
    time: string;
    name: string;
    trainer: string;
    level: string;
    occupancy: { current: number; max: number };
    isPast: boolean;
}

interface ScheduleDay {
    date: string;
    sessions: ScheduleSession[];
}

interface MyBookingsProps {
    bookings: MyBooking[];
    scheduleData?: ScheduleDay[];
}

export function MyBookings({ bookings, scheduleData = [] }: MyBookingsProps) {
    const [isLoadingId, setIsLoadingId] = useState<string | null>(null);
    const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
    const [bookingToReschedule, setBookingToReschedule] = useState<string | null>(null);
    const [selectedNewSession, setSelectedNewSession] = useState<ScheduleSession | null>(null);
    const [toastState, setToastState] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    if (!bookings || bookings.length === 0) {
        return null;
    }

    const handleCancelClick = (bookingId: string) => {
        setBookingToCancel(bookingId);
    };

    const handleRescheduleClick = (bookingId: string) => {
        setBookingToReschedule(bookingId);
        setSelectedNewSession(null);
    };

    const confirmCancel = async () => {
        if (!bookingToCancel) return;

        const id = bookingToCancel;
        setBookingToCancel(null);
        setIsLoadingId(id);

        try {
            const res = await cancelBooking(id);
            if (!res.success) {
                setToastState({ message: res.message, type: 'error' });
            } else {
                setToastState({ message: 'Rezervácia bola úspešne zrušená.', type: 'success' });
            }
        } catch (error) {
            console.error(error);
            setToastState({ message: 'Chyba pri rušení rezervácie.', type: 'error' });
        } finally {
            setIsLoadingId(null);
        }
    };

    const confirmReschedule = async () => {
        if (!bookingToReschedule || !selectedNewSession) return;

        const oldBooking = bookings.find(b => b.id === bookingToReschedule);
        if (!oldBooking) return;

        const id = bookingToReschedule;
        setBookingToReschedule(null);
        setIsLoadingId(id);

        try {
            const res = await rescheduleBooking(
                id,
                selectedNewSession.trainingTypeId,
                selectedNewSession.startTimeISO,
                oldBooking.participants_count || 1
            );
            if (!res.success) {
                setToastState({ message: res.message, type: 'error' });
            } else {
                setToastState({ message: 'Termín bol úspešne zmenený.', type: 'success' });
            }
        } catch (error) {
            console.error(error);
            setToastState({ message: 'Chyba pri zmene termínu.', type: 'error' });
        } finally {
            setIsLoadingId(null);
        }
    };

    return (
        <>
            <div className={styles.container}>
                <div className={styles.header}>
                    <Calendar className={styles.icon} size={24} />
                    <h3 className={styles.title}>Moje naplánované tréningy</h3>
                </div>

                <div className={styles.grid}>
                    {bookings.map((booking) => {
                        const d = new Date(booking.start_time);
                        const dayName = d.toLocaleDateString('sk-SK', { weekday: 'long', timeZone: 'UTC' });
                        const capDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                        const monthName = d.toLocaleDateString('sk-SK', { month: 'long', timeZone: 'UTC' });
                        const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                        const dayNumber = d.getUTCDate();
                        const dateStr = `${capDay}, ${dayNumber}. ${capMonth}`;
                        const timeStr = d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

                        const title = booking.training_type?.title || 'Neznámy tréning';
                        const level = booking.training_type?.level || '';

                        return (
                            <div key={booking.id} className={styles.card}>
                                <div className={styles.cardContent}>
                                    <h4 className={styles.trainingTitle}>
                                        {title}
                                        {(booking.participants_count || 1) > 1 && (
                                            <span style={{ color: '#8C7568', marginLeft: '6px', fontWeight: 600 }}>
                                                (+{(booking.participants_count || 1) - 1})
                                            </span>
                                        )}
                                    </h4>
                                    <div className={styles.details}>
                                        <div className={styles.detailRow}>
                                            <Calendar size={16} />
                                            <span>{dateStr}</span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <Clock size={16} />
                                            <span className={styles.timeHighlight}>{timeStr}</span>
                                        </div>
                                    </div>
                                    {level && (
                                        <span className={styles.levelBadge}>
                                            {level}
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <button
                                        onClick={() => handleRescheduleClick(booking.id)}
                                        disabled={isLoadingId === booking.id}
                                        className={styles.cancelButton}
                                        title="Zmeniť termín"
                                        style={{ color: '#4B5563', backgroundColor: '#F3F4F6' }}
                                    >
                                        {isLoadingId === booking.id ? '...' : <Edit size={20} strokeWidth={1.5} />}
                                    </button>
                                    <button
                                        onClick={() => handleCancelClick(booking.id)}
                                        disabled={isLoadingId === booking.id}
                                        className={styles.cancelButton}
                                        title="Zrušiť rezerváciu"
                                    >
                                        {isLoadingId === booking.id ? '...' : <XCircle size={24} strokeWidth={1.5} />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Cancel Modal */}
            <Modal
                isOpen={!!bookingToCancel}
                onClose={() => setBookingToCancel(null)}
                title="Zrušiť rezerváciu?"
            >
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    {(() => {
                        const booking = bookings.find(b => b.id === bookingToCancel);
                        if (!booking) return null;

                        const startTime = new Date(booking.start_time);
                        const now = new Date();
                        const diffMs = startTime.getTime() - now.getTime();
                        const hours = diffMs / (1000 * 60 * 60);
                        const isLessThanLimit = hours < 12;

                        return (
                            <p style={{ marginBottom: '1.5rem', color: '#4B5563', lineHeight: '1.5' }}>
                                Naozaj chcete zrušiť túto rezerváciu?<br />
                                {isLessThanLimit ? (
                                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                                        Keďže je to menej ako 12h pred tréningom, kredit Vám NEBUDE vrátený.
                                    </span>
                                ) : (
                                    <span>
                                        Kredit Vám bude automaticky vrátený.
                                    </span>
                                )}
                            </p>
                        );
                    })()}

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        <Button variant="outline" onClick={() => setBookingToCancel(null)}>Ponechať</Button>
                        <Button onClick={confirmCancel} style={{ backgroundColor: '#DC2626', color: 'white' }}>Áno, zrušiť</Button>
                    </div>
                </div>
            </Modal>

            {/* Reschedule Modal */}
            <Modal
                isOpen={!!bookingToReschedule}
                onClose={() => setBookingToReschedule(null)}
                title="Zmeniť termín"
            >
                <div style={{ padding: '1rem 0' }}>
                    {(() => {
                        const booking = bookings.find(b => b.id === bookingToReschedule);
                        if (!booking) return null;

                        const startTime = new Date(booking.start_time);
                        const now = new Date();
                        const diffMs = startTime.getTime() - now.getTime();
                        const hours = diffMs / (1000 * 60 * 60);
                        const isLessThanLimit = hours < 12;

                        return (
                            <>
                                {isLessThanLimit && (
                                    <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C' }}>
                                        <strong>Upozornenie:</strong> Keďže meníte termín menej ako 12 hodín pred začiatkom, kredit za pôvodný tréning Vám prepadne. Za nový tréning sa Vám odráta ďalší kredit.
                                    </div>
                                )}

                                <p style={{ marginBottom: '1rem', fontWeight: 600, color: '#374151' }}>Vyberte si nový termín z ponuky:</p>
                                
                                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {scheduleData.map(day => {
                                        // Filter out past, full, and the currently selected session
                                        const availableSessions = day.sessions.filter(s => 
                                            !s.isPast && 
                                            s.occupancy.current < s.occupancy.max && 
                                            s.startTimeISO !== booking.start_time
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

                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                                    <Button variant="outline" onClick={() => setBookingToReschedule(null)}>Zrušiť</Button>
                                    <Button 
                                        onClick={confirmReschedule} 
                                        disabled={!selectedNewSession}
                                        style={{ backgroundColor: '#5E715D', color: 'white', opacity: selectedNewSession ? 1 : 0.5 }}
                                    >
                                        Potvrdiť zmenu
                                    </Button>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </Modal>

            {toastState && (
                <Toast 
                    message={toastState.message} 
                    type={toastState.type} 
                    onClose={() => setToastState(null)} 
                />
            )}
        </>
    );
}
