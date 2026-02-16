'use client';

import React from 'react';
import { User, Check, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { bookTraining, cancelBooking } from '@/app/dashboard/trainings/actions';
import styles from './TrainingCalendar.module.css';
import { useVerification } from '@/components/auth/VerificationContext';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

interface Session {
    id: string | number;
    trainingTypeId: string;
    startTimeISO: string;
    time: string;
    name: string;
    trainer: string;
    level: string;
    priceCredits: number;
    occupancy: {
        current: number;
        max: number;
    };
    isUserRegistered?: boolean;
    bookingId?: string;
    isPast?: boolean;
    isIndividual?: boolean;
}

interface DaySchedule {
    date: string; // e.g., "Pondelok, 20. Október"
    sessions: Session[];
}

interface TrainingCalendarProps {
    schedule: DaySchedule[];
    userCredits: number;
    currentDays: number;
}

export function TrainingCalendar({ schedule, userCredits, currentDays }: TrainingCalendarProps) {
    const searchParams = useSearchParams();
    const highlightId = searchParams.get('highlightId');

    useEffect(() => {
        if (highlightId) {
            const element = document.getElementById(`session-${highlightId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.style.animation = 'highlightPulse 2s ease-in-out';
            }
        }
    }, [highlightId, schedule]); // Depend on schedule to ensure elements are rendered

    return (
        <div className={styles.container}>
            <style jsx global>{`
                @keyframes highlightPulse {
                    0% { background-color: rgba(94, 113, 93, 0.2); }
                    100% { background-color: transparent; }
                }
            `}</style>
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
                            <div
                                key={session.id}
                                id={`session-${session.id}`}
                                className={styles.sessionRow}
                            >
                                <div className={styles.colTime}>{session.time}</div>
                                <div className={styles.colName}>
                                    {session.name}
                                    {session.priceCredits !== 1 && (
                                        <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                                            ({session.priceCredits} kr.)
                                        </span>
                                    )}
                                </div>
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
                <Link href={`/dashboard/trainings?days=${currentDays + 7}`} scroll={false}>
                    <Button variant="primary">Zobraziť viac tréningov</Button>
                </Link>
            </div>
        </div>
    );
}

function ActionButton({ session, userCredits }: { session: Session, userCredits: number }) {
    const { isVerified } = useVerification();
    const [isLoading, setIsLoading] = React.useState(false);

    // State for feedback modal (Success/Error)
    const [modal, setModal] = React.useState<{ isOpen: boolean; title: string; message: string; isError?: boolean } | null>(null);

    // State for confirmation modal
    const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
    const [isLateCancellation, setIsLateCancellation] = React.useState(false);

    const isPast = session.isPast ?? (new Date(session.startTimeISO) < new Date());

    const handleActionClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isPast) return;

        // If registered -> Show confirmation modal
        if (session.isUserRegistered) {
            const start = new Date(session.startTimeISO);
            const now = new Date();
            const diffHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
            setIsLateCancellation(diffHours < 24);
            setConfirmModalOpen(true);
            return;
        }

        // If not registered -> Book immediately (with credit check)
        executeBooking();
    };

    const executeBooking = async () => {
        // Client-side credit check
        // Only check if price is > 0
        if (!session.isUserRegistered && session.priceCredits > 0 && userCredits < session.priceCredits) {
            setModal({
                isOpen: true,
                title: 'Chyba',
                message: `Nemáte dostatok vstupov. Cena tréningu je ${session.priceCredits} kreditov.`,
                isError: true
            });
            return;
        }

        setIsLoading(true);
        try {
            const res = await bookTraining(session.trainingTypeId, session.startTimeISO);
            if (res) {
                setModal({
                    isOpen: true,
                    title: res.success ? 'Rezervácia úspešná' : 'Chyba',
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

    const executeCancellation = async () => {
        setConfirmModalOpen(false);
        if (!session.bookingId) {
            alert('Chyba: ID rezervácie sa nenašlo.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await cancelBooking(session.bookingId);
            if (res) {
                setModal({
                    isOpen: true,
                    title: res.success ? 'Odhlásenie úspešné' : 'Chyba',
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
    // But disable for verification as requested
    const isDisabled = isLoading || (isFull && !session.isUserRegistered) || isPast || (!isVerified && !session.isUserRegistered) || (session.isIndividual && !session.isUserRegistered);

    let buttonText = session.isUserRegistered ? 'Odhlásiť sa' : 'Prihlásiť sa';
    if (!isVerified && !session.isUserRegistered) buttonText = 'Overte email';
    if (session.isIndividual && !session.isUserRegistered) buttonText = 'Individuálne';
    if (isLoading) buttonText = '...';
    if (isPast) buttonText = 'Ukončené';

    return (
        <>
            <Button
                size="sm"
                onClick={handleActionClick}
                className={clsx(styles.actionButton, {
                    [styles.disabled]: isDisabled,
                    [styles.registered]: session.isUserRegistered,
                    'opacity-50 cursor-not-allowed': (!isVerified && !session.isUserRegistered)
                })}
                disabled={isDisabled}
                title={
                    session.isIndividual
                        ? "Tento termín je vyhradený pre individuálny tréning"
                        : (!isVerified && !session.isUserRegistered)
                            ? "Pre prihlásenie musíte mať overený email"
                            : ""
                }
                variant={session.isUserRegistered ? "secondary" : "primary"}
                style={{
                    minWidth: '100px',
                    opacity: (isPast || (!isVerified && !session.isUserRegistered)) ? 0.6 : 1,
                    cursor: (isPast || (!isVerified && !session.isUserRegistered) || (session.isIndividual && !session.isUserRegistered)) ? 'not-allowed' : 'pointer',
                    backgroundColor: (session.isIndividual && !session.isUserRegistered) ? '#DC2626' : undefined, // Red for individual
                    borderColor: (session.isIndividual && !session.isUserRegistered) ? '#DC2626' : undefined,
                    color: (session.isIndividual && !session.isUserRegistered) ? 'white' : undefined
                }}
            >
                {buttonText}
            </Button>

            {/* Success/Error Modal */}
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

            {/* Confirmation Modal */}
            <Modal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                title="Zrušiť rezerváciu?"
            >
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    {isLateCancellation ? (
                        <div style={{ backgroundColor: '#FEF2F2', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <p style={{ fontWeight: 'bold', color: '#DC2626', marginBottom: '0.5rem' }}>
                                UPOZORNENIE
                            </p>
                            <p style={{ color: '#7F1D1D', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                Odhlasujete sa menej ako 24 hodín pred začiatkom tréningu.<br />
                                <strong>{session.priceCredits > 0 ? 'Váš vstup NEBUDE vrátený.' : 'Tréning je zadarmo, žiadny vstup sa nevracia.'}</strong>
                            </p>
                        </div>
                    ) : (
                        <p style={{ marginBottom: '1.5rem', color: '#4B5563', lineHeight: '1.5' }}>
                            Naozaj chcete zrušiť túto rezerváciu?<br />
                            {session.priceCredits > 0 ? 'Vstup Vám bude automaticky vrátený na účet.' : 'Tento tréning je zadarmo.'}
                        </p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmModalOpen(false)}
                        >
                            Ponechať
                        </Button>
                        <Button
                            onClick={executeCancellation}
                            style={{ backgroundColor: '#DC2626', color: 'white' }}
                        >
                            {isLateCancellation ? 'Rozumiem, zrušiť' : 'Áno, zrušiť'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
