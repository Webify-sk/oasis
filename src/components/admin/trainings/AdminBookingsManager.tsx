'use client';

import { useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { sk } from 'date-fns/locale';
import { Button } from '@/components/ui/Button';
import { Pencil, Trash2, Clock, Phone, Mail } from 'lucide-react';
import { cancelBooking, rescheduleBooking } from '@/app/dashboard/trainings/actions';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';

interface Booking {
    id: string;
    start_time: string;
    participants_count: number;
    training_type: {
        id: string;
        title: string;
        level: string;
    };
    user: {
        id: string;
        full_name: string;
        email: string;
        phone: string;
    };
}

interface ScheduleSession {
    id: string;
    trainingTypeId: string;
    startTimeISO: string;
    time: string;
    name: string;
    trainer: string;
    occupancy: { current: number; max: number };
    isPast: boolean;
}

interface ScheduleDay {
    date: string;
    sessions: ScheduleSession[];
}

interface Props {
    initialBookings: Booking[];
    scheduleData: ScheduleDay[];
}

export default function AdminBookingsManager({ initialBookings, scheduleData }: Props) {
    const [bookings, setBookings] = useState<Booking[]>(initialBookings);
    
    // Modal states
    const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
    const [bookingToReschedule, setBookingToReschedule] = useState<string | null>(null);
    const [selectedNewSession, setSelectedNewSession] = useState<ScheduleSession | null>(null);
    
    // Global states
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [toastState, setToastState] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleCancelClick = (id: string) => setBookingToCancel(id);
    const handleRescheduleClick = (id: string) => {
        setBookingToReschedule(id);
        setSelectedNewSession(null);
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
                setBookings(prev => prev.filter(b => b.id !== id));
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
        const oldBooking = bookings.find(b => b.id === id);
        if (!oldBooking) return;

        setBookingToReschedule(null);
        setLoadingId(id);

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
                // We update local state to reflect change
                setBookings(prev => prev.map(b => {
                    if (b.id === id) {
                        return {
                            ...b,
                            start_time: selectedNewSession.startTimeISO,
                            training_type: {
                                ...b.training_type,
                                id: selectedNewSession.trainingTypeId,
                                title: selectedNewSession.name
                            }
                        };
                    }
                    return b;
                }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
            }
        } catch (error) {
            setToastState({ message: 'Chyba pri zmene termínu.', type: 'error' });
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
                <table style={{ minWidth: '800px', width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', fontSize: '0.875rem' }}>Dátum a Čas</th>
                            <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', fontSize: '0.875rem' }}>Tréning</th>
                            <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', fontSize: '0.875rem' }}>Klient</th>
                            <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', fontSize: '0.875rem', textAlign: 'center' }}>Miest</th>
                            <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', fontSize: '0.875rem', textAlign: 'right' }}>Akcie</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                    Žiadne nadchádzajúce rezervácie.
                                </td>
                            </tr>
                        ) : (
                            bookings.map((booking) => {
                                const startDate = new Date(booking.start_time);
                                const isProcessing = loadingId === booking.id;

                                return (
                                    <tr key={booking.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: isProcessing ? 0.5 : 1 }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '0.25rem' }}>
                                                {formatInTimeZone(startDate, 'Europe/Bratislava', 'd. MMMM yyyy', { locale: sk })}
                                            </div>
                                            <div style={{ color: '#6b7280', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Clock size={14} />
                                                {formatInTimeZone(startDate, 'Europe/Bratislava', 'HH:mm')}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '500' }}>{booking.training_type.title}</div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{booking.training_type.level || 'Všetky úrovne'}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '500' }}>{booking.user.full_name || 'Neznámy klient'}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                {booking.user.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12}/> {booking.user.phone}</span>}
                                                {booking.user.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12}/> {booking.user.email}</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>
                                            {booking.participants_count}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleRescheduleClick(booking.id)}
                                                    disabled={isProcessing}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '0.25rem' }}
                                                    title="Zmeniť termín"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleCancelClick(booking.id)}
                                                    disabled={isProcessing}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.25rem' }}
                                                    title="Zrušiť"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Cancel Modal */}
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

            {/* Reschedule Modal */}
            <Modal
                isOpen={!!bookingToReschedule}
                onClose={() => setBookingToReschedule(null)}
                title="Zmeniť termín"
            >
                <div style={{ padding: '0.5rem 0' }}>
                    <p style={{ marginBottom: '1rem', fontWeight: 600, color: '#374151' }}>Vyberte nový termín z rozvrhu (bez 12h penalizácie pre klienta):</p>
                    
                    <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
                        {scheduleData.map(day => {
                            const availableSessions = day.sessions.filter(s => 
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
