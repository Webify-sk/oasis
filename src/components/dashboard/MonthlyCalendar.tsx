'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { isBookingLocked } from '@/utils/booking-logic';
import styles from './Calendar.module.css';

interface TrainingSession {
    id: string; // Composite ID or unique
    time: string;
    title: string;
    trainer: string;
    date: Date;
    isRegistered?: boolean;
    occupancy?: {
        current: number;
        max: number;
    };
    isIndividual?: boolean;
}

interface MonthlyCalendarProps {
    currentDate: Date;
    events: TrainingSession[];
}

export function MonthlyCalendar({ currentDate, events }: MonthlyCalendarProps) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const todayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to today if it exists in the current view
        if (todayRef.current) {
            todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentDate]);

    // Calendar logic
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // adjust for Monday start (0=Sun, 1=Mon)
    // We want Mon=0, Sun=6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    // Navigation links
    const prevMonthDate = new Date(year, month - 1, 1);
    const nextMonthDate = new Date(year, month + 1, 1);

    // Helper for local date string YYYY-MM-DD
    const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const pathname = usePathname();
    const prevLink = `${pathname}?date=${formatDate(prevMonthDate)}`;
    const nextLink = `${pathname}?date=${formatDate(nextMonthDate)}`;

    const monthName = currentDate.toLocaleString('sk-SK', { month: 'long', year: 'numeric' });

    // Grid cells
    const cells = [];
    const totalSlots = 42; // 6 rows * 7 days

    // Previous month filler
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const d = prevMonthLastDay - i;
        cells.push({ day: d, type: 'prev' });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        cells.push({ day: i, type: 'current' });
    }

    // Next month filler
    const remaining = totalSlots - cells.length;
    for (let i = 1; i <= remaining; i++) {
        cells.push({ day: i, type: 'next' });
    }

    const weekDays = ['Pon', 'Uto', 'Str', 'Štv', 'Pia', 'Sob', 'Ned'];

    // Helper to find events
    const getEventsForDay = (day: number, type: string) => {
        if (type !== 'current') return [];
        return events.filter(e => e.date.getDate() === day && e.date.getMonth() === month);
    };

    const isToday = (day: number, type: string) => {
        if (type !== 'current') return false;
        const today = new Date();
        return today.getDate() === day &&
            today.getMonth() === month &&
            today.getFullYear() === year;
    };

    const isEventPast = (evt: TrainingSession) => {
        let timeStr = evt.time;
        if (timeStr.includes('-')) {
            timeStr = timeStr.split('-')[0].trim();
        }
        const [hours, minutes] = timeStr.split(':').map(Number);
        const eventDate = new Date(evt.date);
        eventDate.setHours(hours, minutes, 0, 0);
        return eventDate < new Date();
    };

    const [selectedEvent, setSelectedEvent] = useState<TrainingSession | null>(null);
    const router = useRouter();

    const handlePrev = () => {
        router.push(prevLink);
        router.refresh();
    };

    const handleNext = () => {
        router.push(nextLink);
        router.refresh();
    };

    const isCurrentMonth = () => {
        const today = new Date();
        return currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.monthTitle}>{monthName}</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={handlePrev}
                        className={styles.navButton}
                        disabled={isCurrentMonth()}
                        style={isCurrentMonth() ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        title={isCurrentMonth() ? "Nemôžete ísť do minulosti" : "Predchádzajúci mesiac"}
                    >
                        <ChevronLeft size={16} /> Predchádzajúci
                    </button>
                    <button onClick={handleNext} className={styles.navButton}>
                        Nasledujúci <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div className={styles.grid}>
                {weekDays.map(d => (
                    <div key={d} className={styles.dayHeader}>{d}</div>
                ))}

                {cells.map((cell, idx) => {
                    let cellDate = new Date(year, month, cell.day);
                    if (cell.type === 'prev') cellDate = new Date(year, month - 1, cell.day);
                    if (cell.type === 'next') cellDate = new Date(year, month + 1, cell.day);

                    const cellEvents = events.filter(e => e.date.toDateString() === cellDate.toDateString());

                    return (
                        <div
                            key={idx}
                            ref={isToday(cell.day, cell.type) ? todayRef : null}
                            className={`${styles.dayCell} ${cell.type !== 'current' ? styles.otherMonth : ''} ${isToday(cell.day, cell.type) ? styles.today : ''}`}
                        >
                            <span className={styles.dayNumber}>{cell.day}</span>
                            {cellEvents.map((evt, i) => {
                                const isPast = isEventPast(evt);
                                if (isPast) return null; // Hide past events

                                // Check 14-day limit
                                const limitDate = new Date();
                                limitDate.setDate(limitDate.getDate() + 14);
                                limitDate.setHours(23, 59, 59, 999);

                                let timeStr = evt.time;
                                if (timeStr.includes('-')) timeStr = timeStr.split('-')[0].trim();
                                const [hours, minutes] = timeStr.split(':').map(Number);
                                const eventDate = new Date(evt.date);
                                eventDate.setHours(hours, minutes, 0, 0);

                                if (eventDate > limitDate) return null;

                                // Calculate isLocked for visual styling
                                const [h, m] = evt.time.split('-')[0].trim().split(':').map(Number);
                                const d = new Date(evt.date);
                                d.setHours(h, m, 0, 0);
                                const y = d.getFullYear();
                                const mo = String(d.getMonth() + 1).padStart(2, '0');
                                const da = String(d.getDate()).padStart(2, '0');
                                const ho = String(h).padStart(2, '0');
                                const mi = String(m).padStart(2, '0');
                                const iso = `${y}-${mo}-${da}T${ho}:${mi}:00.000Z`;

                                let isLocked = false;
                                if (!evt.isRegistered && (!evt.occupancy || evt.occupancy.current === 0)) {
                                    const check = isBookingLocked(iso);
                                    isLocked = check.isLocked;
                                }

                                return (
                                    <div
                                        key={i}
                                        className={`${styles.event} ${evt.isRegistered ? styles.registered : ''} ${evt.occupancy && evt.occupancy.current >= evt.occupancy.max && !evt.isRegistered ? styles.full : ''}`}
                                        title={`${evt.time} - ${evt.title} (${evt.trainer})${evt.isRegistered ? ' - ZAREGISTROVANÉ' : ''}${evt.isIndividual ? ' - INDIVIDUÁLNE' : ''}`}
                                        onClick={!isPast ? () => setSelectedEvent(evt) : undefined}
                                        style={{
                                            cursor: isPast ? 'default' : 'pointer',
                                            opacity: isPast ? 0.5 : 1,
                                            // Red background for individual sessions
                                            backgroundColor: (evt.isIndividual && !evt.isRegistered)
                                                ? '#FEF2F2'
                                                : (isLocked && !evt.isRegistered) // Grey for locked
                                                    ? '#F3F4F6'
                                                    : undefined,
                                            borderLeft: (evt.isIndividual && !evt.isRegistered)
                                                ? '3px solid #DC2626'
                                                : (isLocked && !evt.isRegistered)
                                                    ? '3px solid #9CA3AF'
                                                    : undefined,
                                            color: (evt.isIndividual && !evt.isRegistered)
                                                ? '#DC2626'
                                                : (isLocked && !evt.isRegistered)
                                                    ? '#6B7280'
                                                    : undefined
                                        }}
                                    >
                                        <strong>{evt.time}</strong> {evt.title}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Simple Modal */}
            {selectedEvent && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setSelectedEvent(null)}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '400px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                        animation: 'fadeInUp 0.3s ease-out'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontFamily: 'serif', fontSize: '1.5rem', marginBottom: '0.5rem', color: '#8C7568' }}>
                            {selectedEvent.title}
                        </h3>
                        <div style={{ marginBottom: '1.5rem', color: '#666' }}>
                            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                🕒 <strong style={{ color: '#333' }}>{selectedEvent.time}</strong>
                            </p>
                            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                📅 {selectedEvent.date.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                👤 Tréner: <strong>{selectedEvent.trainer}</strong>
                            </p>
                            {selectedEvent.occupancy && (
                                <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: selectedEvent.occupancy.current >= selectedEvent.occupancy.max ? '#DC2626' : '#666' }}>
                                    👥 Obsadenosť: <strong>{selectedEvent.occupancy.current}/{selectedEvent.occupancy.max}</strong>
                                    {selectedEvent.occupancy.current >= selectedEvent.occupancy.max && ' (Obsadené)'}
                                </p>
                            )}
                        </div>

                        {selectedEvent.isRegistered && (
                            <div style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                ✅ Na tento tréning ste prihlásený.
                            </div>
                        )}

                        {selectedEvent.isIndividual && !selectedEvent.isRegistered && (
                            <div style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🔒 Individuálny tréning - nie je možné sa prihlásiť online.
                            </div>
                        )}

                        {/* Locked check for Monthly Calendar Modal */}
                        {(() => {
                            if (!selectedEvent.isRegistered && !selectedEvent.isIndividual) {
                                // Assuming we can reconstruct ISO from event.time and event.date? 
                                // event.date is Date object 00:00:00 usually?
                                // Wait, MonthlyCalendar `events` have `date` object.
                                // Does `evt.time` match the format needed?
                                // TrainingSession interface has `time: string` (e.g. "18:00").
                                // We need to construct the full ISO string for `isBookingLocked`.

                                const [hours, minutes] = selectedEvent.time.split('-')[0].trim().split(':').map(Number);
                                // We need to match how TrainingCalendar constructs timestamps.
                                // Ideally pass full ISO in event data.
                                // But we can approximate:
                                const d = new Date(selectedEvent.date);
                                d.setHours(hours, minutes, 0, 0);
                                // This 'd' is in local browser time? Or UTC? 
                                // `selectedEvent.date` comes from parent.

                                // Actually, `isBookingLocked` expects "Face Value ISO".
                                // If we construct a Date object in browser, `d.toISOString()` will be real UTC (shifted).
                                // We need to construct a string "YYYY-MM-DDTHH:mm:00.000Z" where HH is the face value hour.

                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                const h = String(hours).padStart(2, '0');
                                const min = String(minutes).padStart(2, '0');

                                // Face Value ISO
                                const iso = `${y}-${m}-${day}T${h}:${min}:00.000Z`;

                                // Check occupancy 
                                const currentOcc = selectedEvent.occupancy?.current || 0;

                                if (currentOcc === 0) {
                                    const check = isBookingLocked(iso);
                                    if (check.isLocked) {
                                        return (
                                            <div style={{ backgroundColor: '#F3F4F6', color: '#6B7280', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                ⏳ Prihlasovanie bolo uzavreté. Už nie je možné sa prihlásiť.
                                            </div>
                                        );
                                    }
                                }
                            }
                            return null;
                        })()}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    background: 'white',
                                    cursor: 'pointer',
                                    color: '#666'
                                }}
                            >
                                Zavrieť
                            </button>
                            <Link href={`/dashboard/trainings?date=${formatDate(selectedEvent.date)}&highlightId=${selectedEvent.id}`}>
                                <button style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#8C7568',
                                    cursor: 'pointer',
                                    color: 'white'
                                }}>
                                    Prejsť na rezervácie
                                </button>
                            </Link>
                        </div>
                    </div >
                </div >
            )
            }
        </div >
    );
}
