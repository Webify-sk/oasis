'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styles from '@/components/dashboard/Calendar.module.css'; // Reusing styles

interface TrainingSession {
    id: string;
    time: string;
    title: string;
    trainer: string;
    date: Date;
    isRegistered?: boolean; // Always false or undefined for public
}

interface PublicCalendarProps {
    currentDate: Date;
    events: TrainingSession[];
}

export function PublicCalendar({ currentDate, events }: PublicCalendarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Calendar logic (Same as MonthlyCalendar)
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    // Navigation links
    const prevMonthDate = new Date(year, month - 1, 1);
    const nextMonthDate = new Date(year, month + 1, 1);

    const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handlePrev = () => {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('date', formatDate(prevMonthDate));
        router.push(`?${newParams.toString()}`);
    };

    const handleNext = () => {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('date', formatDate(nextMonthDate));
        router.push(`?${newParams.toString()}`);
    };

    const monthName = currentDate.toLocaleString('sk-SK', { month: 'long', year: 'numeric' });

    // Grid cells
    const cells = [];
    const totalSlots = 42;

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

    const handleBookClick = (evt: TrainingSession) => {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk';
        // Redirect to dashboard with date parameter
        window.open(`${baseUrl}/dashboard/trainings?date=${formatDate(evt.date)}`, '_blank');
    };

    return (
        <div className={styles.container} style={{ height: 'auto', minHeight: '100%', padding: '10px' }}>
            <div className={styles.header}>
                <h2 className={styles.monthTitle} style={{ fontSize: '1.2rem' }}>{monthName}</h2>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={handlePrev} className={styles.navButton}>
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={handleNext} className={styles.navButton}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div className={styles.grid}>
                {weekDays.map(d => (
                    <div key={d} className={styles.dayHeader} style={{ fontSize: '0.8rem' }}>{d}</div>
                ))}

                {cells.map((cell, idx) => {
                    const cellEvents = getEventsForDay(cell.day, cell.type);
                    return (
                        <div key={idx} className={`${styles.dayCell} ${cell.type !== 'current' ? styles.otherMonth : ''} ${isToday(cell.day, cell.type) ? styles.today : ''}`} style={{ minHeight: '80px' }}>
                            <span className={styles.dayNumber}>{cell.day}</span>
                            {cellEvents.map((evt, i) => {
                                const isPast = isEventPast(evt);
                                return (
                                    <div
                                        key={i}
                                        className={styles.event}
                                        title={`${evt.time} - ${evt.title}`}
                                        onClick={() => setSelectedEvent(evt)}
                                        style={{
                                            cursor: 'pointer',
                                            opacity: isPast ? 0.6 : 1,
                                            fontSize: '0.7rem',
                                            padding: '2px 4px'
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

            {/* Modal */}
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
                    zIndex: 2000,
                    backdropFilter: 'blur(2px)'
                }} onClick={() => setSelectedEvent(null)}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        width: '90%',
                        maxWidth: '350px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                        animation: 'fadeInUp 0.2s ease-out'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontFamily: 'serif', fontSize: '1.25rem', marginBottom: '0.5rem', color: '#8C7568' }}>
                            {selectedEvent.title}
                        </h3>
                        <div style={{ marginBottom: '1rem', color: '#555', fontSize: '0.9rem' }}>
                            <p style={{ marginBottom: '4px' }}>🕒 <strong>{selectedEvent.time}</strong></p>
                            <p style={{ marginBottom: '4px' }}>📅 {selectedEvent.date.toLocaleDateString('sk-SK')}</p>
                            <p>👤 Tréner: {selectedEvent.trainer}</p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: '1px solid #ddd',
                                    background: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Zavrieť
                            </button>
                            <button
                                onClick={() => handleBookClick(selectedEvent)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#8C7568',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Rezervovať
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
