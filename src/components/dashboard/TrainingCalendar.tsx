'use client';

import React from 'react';
import { User, Check, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { bookTraining, cancelBooking } from '@/app/dashboard/trainings/actions';
import styles from './TrainingCalendar.module.css';

interface Session {
    id: string | number;
    time: string;
    name: string;
    trainer: string;
    level: string;
    occupancy: {
        current: number;
        max: number;
    };
    isUserRegistered?: boolean;
}

interface DaySchedule {
    date: string; // e.g., "Pondelok, 20. Október"
    sessions: Session[];
}

interface TrainingCalendarProps {
    schedule: DaySchedule[];
    userCredits: number;
}

export function TrainingCalendar({ schedule, userCredits }: TrainingCalendarProps) {
    return (
        <div className={styles.container}>
            {schedule.map((day, index) => (
                <div
                    key={day.date}
                    className={`${styles.dayBlock} animate-fadeInUp`}
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <h3 className={styles.dateHeader}>{day.date}</h3>

                    <div className={styles.tableHeader}>
                        <div className={styles.colTime}>ČAS</div>
                        <div className={styles.colName}>TRÉNING</div>
                        <div className={styles.colTrainer}>TRÉNER</div>
                        <div className={styles.colLevel}>ÚROVEŇ</div>
                        <div className={styles.colOccupancy}>OBSADENOSŤ</div>
                    </div>

                    <div className={styles.sessionList}>
                        {day.sessions.map((session) => (
                            <div key={session.id} className={styles.sessionRow}>
                                <div className={styles.colTime}>{session.time}</div>
                                <div className={styles.colName}>{session.name}</div>
                                <div className={styles.colTrainer}>{session.trainer}</div>
                                <div className={styles.colLevel}>{session.level}</div>

                                <div className={styles.colOccupancy}>
                                    <div className={clsx(styles.occupancyBadge, { [styles.full]: session.occupancy.current >= session.occupancy.max })}>
                                        <User size={14} />
                                        <span>{session.occupancy.current}/{session.occupancy.max}</span>
                                    </div>

                                    <ActionButton
                                        session={session}
                                        userCredits={userCredits}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div className={styles.footerActions}>
                <Button variant="primary">ZOBRAZIŤ VŠETKY TRÉNINGY</Button>
            </div>
        </div>
    );
}

function ActionButton({ session, userCredits }: { session: any, userCredits: number }) {
    const [isLoading, setIsLoading] = React.useState(false);

    // State for feedback modal
    const [modal, setModal] = React.useState<{ isOpen: boolean; title: string; message: string; isError?: boolean } | null>(null);

    const handleAction = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('ActionButton click', { isUserRegistered: session.isUserRegistered, userCredits });
        // Client-side credit check for smoother UX (no flicker)
        if (!session.isUserRegistered && userCredits < 1) {
            setModal({
                isOpen: true,
                title: 'Chyba',
                message: 'Nemáte dostatok vstupov. Prosím, zakúpte si vstupy.',
                isError: true
            });
            return;
        }

        setIsLoading(true);
        try {
            let res;
            if (session.isUserRegistered) {
                if (!confirm('Naozaj sa chcete odhlásiť z tréningu?')) {
                    setIsLoading(false);
                    return;
                }
                if (!session.bookingId) {
                    alert('Chyba: ID rezervácie sa nenašlo.');
                    setIsLoading(false);
                    return;
                }
                res = await cancelBooking(session.bookingId);
            } else {
                res = await bookTraining(session.trainingTypeId, session.startTimeISO);
            }

            if (res) {
                setModal({
                    isOpen: true,
                    title: res.success ? (session.isUserRegistered ? 'Odhlásenie úspešné' : 'Rezervácia úspešná') : 'Chyba',
                    message: res.message,
                    isError: !res.success
                });
            }
        } catch (e) {
            console.error(e);
            setModal({
                isOpen: true,
                title: 'Chyba',
                message: 'Nastala neočakávaná chyba.',
                isError: true
            });
        } finally {
            setIsLoading(false);
        }
    };

    const isFull = session.occupancy.current >= session.occupancy.max;
    // Don't disable button just because of credits, so they can click and see the specific error message
    const isDisabled = isLoading || (isFull && !session.isUserRegistered);

    return (
        <>
            <Button
                size="sm"
                onClick={handleAction}
                className={clsx(styles.actionButton, {
                    [styles.disabled]: isDisabled,
                    [styles.registered]: session.isUserRegistered
                })}
                disabled={isDisabled}
                variant={session.isUserRegistered ? "secondary" : "primary"}
                style={{
                    minWidth: '100px'
                }}
            >
                {isLoading ? '...' : (session.isUserRegistered ? 'Odhlásiť sa' : 'Prihlásiť sa')}
            </Button>

            {modal && (
                <Modal
                    isOpen={modal.isOpen}
                    onClose={() => setModal(null)}
                    title={modal.title}
                >
                    <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            {modal.isError ? (
                                <div style={{
                                    padding: '1rem',
                                    borderRadius: '50%',
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626'
                                }}>
                                    <AlertCircle size={32} />
                                </div>
                            ) : (
                                <div style={{
                                    padding: '1rem',
                                    borderRadius: '50%',
                                    backgroundColor: '#F0FDF4',
                                    color: '#16A34A'
                                }}>
                                    <CheckCircle size={32} />
                                </div>
                            )}
                        </div>

                        <p style={{
                            fontSize: '1.1rem',
                            color: '#4B5563',
                            lineHeight: '1.6',
                            marginBottom: '2rem'
                        }}>
                            {modal.message}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Button
                                onClick={() => setModal(null)}
                                size="lg"
                                style={{
                                    minWidth: '150px',
                                    backgroundColor: modal.isError ? '#DC2626' : '#5E715D'
                                }}
                            >
                                Zavrieť
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
