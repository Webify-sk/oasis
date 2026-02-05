'use client';

import { useState } from 'react';
import { Calendar, Clock, XCircle } from 'lucide-react';
import { cancelBooking } from '@/app/dashboard/trainings/actions';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import styles from './MyBookings.module.css';

interface MyBooking {
    id: string;
    start_time: string;
    training_type: {
        title: string;
        level: string;
    } | any;
}

interface MyBookingsProps {
    bookings: MyBooking[];
}

export function MyBookings({ bookings }: MyBookingsProps) {
    const [isLoadingId, setIsLoadingId] = useState<string | null>(null);
    const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);

    if (!bookings || bookings.length === 0) {
        return null;
    }

    const handleCancelClick = (bookingId: string) => {
        setBookingToCancel(bookingId);
    };

    const confirmCancel = async () => {
        if (!bookingToCancel) return;

        const id = bookingToCancel;
        setBookingToCancel(null); // Close modal
        setIsLoadingId(id);

        try {
            const res = await cancelBooking(id);
            if (!res.success) {
                alert(res.message);
            }
        } catch (error) {
            console.error(error);
            alert('Chyba pri rušení rezervácie.');
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

                        // Format Date
                        const dayName = d.toLocaleDateString('sk-SK', { weekday: 'long' });
                        const capDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                        const monthName = d.toLocaleDateString('sk-SK', { month: 'long' });
                        const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                        const dateStr = `${capDay}, ${d.getDate()}. ${capMonth}`;

                        // Format Time
                        const timeStr = d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                        const title = booking.training_type?.title || 'Neznámy tréning';
                        const level = booking.training_type?.level || '';

                        return (
                            <div key={booking.id} className={styles.card}>
                                <div className={styles.cardContent}>
                                    <h4 className={styles.trainingTitle}>{title}</h4>
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

                                <button
                                    onClick={() => handleCancelClick(booking.id)}
                                    disabled={isLoadingId === booking.id}
                                    className={styles.cancelButton}
                                    title="Zrušiť rezerváciu"
                                >
                                    {isLoadingId === booking.id ? '...' : <XCircle size={24} strokeWidth={1.5} />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Modal
                isOpen={!!bookingToCancel}
                onClose={() => setBookingToCancel(null)}
                title="Zrušiť rezerváciu?"
            >
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <p style={{ marginBottom: '1.5rem', color: '#4B5563', lineHeight: '1.5' }}>
                        Naozaj chcete zrušiť túto rezerváciu?<br />
                        Vstup Vám bude automaticky vrátený na účet.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        <Button
                            variant="outline"
                            onClick={() => setBookingToCancel(null)}
                        >
                            Ponechať
                        </Button>
                        <Button
                            onClick={confirmCancel}
                            style={{ backgroundColor: '#DC2626', color: 'white' }}
                        >
                            Áno, zrušiť
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
