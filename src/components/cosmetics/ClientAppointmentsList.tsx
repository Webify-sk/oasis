'use client';

import { useState } from 'react';
import { Calendar, Clock, User, XCircle, AlertCircle, Edit3, Save } from 'lucide-react';
import { cancelAppointment, rescheduleAppointment } from '@/actions/cosmetic-actions';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { Button } from '@/components/ui/Button'; // Assuming Button is available
import { Modal } from '@/components/ui/Modal'; // Assuming Modal is available

interface Appointment {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    cosmetic_services: {
        title: string;
        price: number;
        duration_minutes: number;
    };
    employees?: {
        name: string;
        color: string | null;
    };
    profiles?: {
        full_name: string;
        phone: string | null;
        email: string | null;
    };
}

export function ClientAppointmentsList({ initialAppointments, isEmployeeView = false }: { initialAppointments: Appointment[], isEmployeeView?: boolean }) {
    const [appointments, setAppointments] = useState(initialAppointments);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // Reschedule State
    const [rescheduleData, setRescheduleData] = useState<{ id: string, date: string, start: string, duration: number } | null>(null);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [rescheduleLoading, setRescheduleLoading] = useState(false);

    const handleCancel = async (id: string) => {
        // ... (existing code)
        if (!confirm('Naozaj chcete zrušiť túto rezerváciu?')) return;

        setLoadingId(id);
        const res = await cancelAppointment(id);

        if (res.success) {
            setAppointments(prev => prev.map(app =>
                app.id === id ? { ...app, status: 'cancelled' } : app
            ));
        } else {
            alert('Nepodarilo sa zrušiť rezerváciu.');
        }
        setLoadingId(null);
    };

    const handleOpenReschedule = (appointment: Appointment) => {
        const date = new Date(appointment.start_time);
        setRescheduleData({
            id: appointment.id,
            date: format(date, 'yyyy-MM-dd'),
            start: format(date, 'HH:mm'),
            duration: appointment.cosmetic_services.duration_minutes
        });
        setIsRescheduleModalOpen(true);
    };

    const handleRescheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rescheduleData) return;

        setRescheduleLoading(true);

        const startDateTime = `${rescheduleData.date}T${rescheduleData.start}:00`;
        const startDate = new Date(startDateTime);
        const endDate = new Date(startDate.getTime() + rescheduleData.duration * 60000);
        const endDateTime = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");

        const res = await rescheduleAppointment(rescheduleData.id, startDateTime, endDateTime);

        setRescheduleLoading(false);
        if (res.success) {
            setAppointments(prev => prev.map(app =>
                app.id === rescheduleData.id ? { ...app, start_time: startDateTime, end_time: endDateTime } : app
            ));
            setIsRescheduleModalOpen(false);
            setRescheduleData(null);
        } else {
            alert('Nepodarilo sa zmeniť termín. Skúste iný čas.');
        }
    };

    const upcoming = appointments.filter(a => new Date(a.start_time) > new Date() && a.status !== 'cancelled');
    const past = appointments.filter(a => new Date(a.start_time) <= new Date() && a.status !== 'cancelled');
    const cancelled = appointments.filter(a => a.status === 'cancelled');

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {upcoming.length === 0 ? (
                <div style={{
                    padding: '2rem',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#666',
                    border: '1px dashed #ddd'
                }}>
                    Nemáte žiadne nadchádzajúce rezervácie.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {upcoming.map(app => (
                        <AppointmentCard
                            key={app.id}
                            appointment={app}
                            onCancel={handleCancel}
                            onReschedule={() => handleOpenReschedule(app)}
                            loading={loadingId === app.id}
                            isEmployeeView={isEmployeeView}
                        />
                    ))}
                </div>
            )}

            {/* History - Hide for Employee View */}
            {!isEmployeeView && (past.length > 0 || cancelled.length > 0) && (
                <div style={{ marginTop: '3rem' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#666' }}>História</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.7 }}>
                        {past.map(app => (
                            <AppointmentCard key={app.id} appointment={app} readOnly isEmployeeView={isEmployeeView} />
                        ))}
                        {cancelled.map(app => (
                            <AppointmentCard key={app.id} appointment={app} readOnly isCancelled isEmployeeView={isEmployeeView} />
                        ))}
                    </div>
                </div>
            )}

            {/* Reschedule Modal */}
            <Modal
                isOpen={isRescheduleModalOpen}
                onClose={() => setIsRescheduleModalOpen(false)}
                title="Zmeniť čas rezervácie"
            >
                {rescheduleData && (
                    <form onSubmit={handleRescheduleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>Dátum</label>
                            <input
                                type="date"
                                value={rescheduleData.date}
                                onChange={e => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>Čas začiatku</label>
                            <input
                                type="time"
                                value={rescheduleData.start}
                                onChange={e => setRescheduleData({ ...rescheduleData, start: e.target.value })}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <Button type="button" variant="ghost" onClick={() => setIsRescheduleModalOpen(false)}>Zrušiť</Button>
                            <Button type="submit" variant="primary" disabled={rescheduleLoading}>
                                {rescheduleLoading ? 'Ukladám...' : 'Uložiť zmenu'}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}

function AppointmentCard({ appointment, onCancel, onReschedule, loading, readOnly, isCancelled, isEmployeeView }: {
    appointment: Appointment,
    onCancel?: (id: string) => void,
    onReschedule?: () => void,
    loading?: boolean,
    readOnly?: boolean,
    isCancelled?: boolean,
    isEmployeeView?: boolean
}) {
    const start = new Date(appointment.start_time);

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid #eee',
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Status Strip */}
            <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '6px',
                backgroundColor: isCancelled ? '#ef5350' : '#5E715D'
            }} />

            {/* Date Box */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '70px',
                padding: '0.5rem',
                backgroundColor: '#f5f7f5',
                borderRadius: '8px',
                color: '#333'
            }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{format(start, 'dd', { locale: sk })}</span>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>{format(start, 'MMM', { locale: sk })}</span>
            </div>

            {/* Details */}
            <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.1rem', color: isCancelled ? '#999' : '#333', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                    {appointment.cosmetic_services?.title || 'Unknown Service'}
                </h4>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={16} />
                        {format(start, 'HH:mm')} ({appointment.cosmetic_services?.duration_minutes} min)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={16} />
                        {isEmployeeView
                            ? (appointment.profiles?.full_name || 'Neznámy klient')
                            : (appointment.employees?.name || 'Neznámy')
                        }
                    </div>
                </div>

                {isCancelled && <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', color: '#ef5350', fontWeight: 'bold' }}>ZRUŠENÉ</span>}
            </div>

            {/* Price & Action */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#5E715D' }}>
                    {appointment.cosmetic_services?.price} €
                </span>

                {!readOnly && !isCancelled && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {/* Reschedule (Employee Only? Or client too? User asked for Employee Dashboard) */}
                        {/* Let's showing it generally as it's useful, or check isEmployeeView */}
                        {isEmployeeView && onReschedule && (
                            <button
                                onClick={onReschedule}
                                title="Zmeniť čas"
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    color: '#4b5563',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    padding: '0.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Edit3 size={16} />
                            </button>
                        )}

                        {onCancel && (
                            <button
                                onClick={() => onCancel(appointment.id)}
                                disabled={loading}
                                style={{
                                    backgroundColor: '#fff0f0',
                                    color: '#d32f2f',
                                    border: '1px solid #ffcdd2',
                                    borderRadius: '6px',
                                    padding: '0.5rem 1rem',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontWeight: '500',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {loading ? 'Ruším...' : (
                                    <>
                                        <XCircle size={16} /> Zrušiť
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
