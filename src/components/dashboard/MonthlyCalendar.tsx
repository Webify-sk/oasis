'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import styles from './Calendar.module.css';

interface TrainingSession {
    id: string; // Composite ID or unique
    time: string;
    title: string;
    trainer: string;
    date: Date;
    isRegistered?: boolean;
}

interface MonthlyCalendarProps {
    currentDate: Date;
    events: TrainingSession[];
}

export function MonthlyCalendar({ currentDate, events }: MonthlyCalendarProps) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

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

    const prevLink = `?date=${prevMonthDate.toISOString().split('T')[0]}`;
    const nextLink = `?date=${nextMonthDate.toISOString().split('T')[0]}`;

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

    const [selectedEvent, setSelectedEvent] = useState<TrainingSession | null>(null);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.monthTitle}>{monthName}</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link href={prevLink} className={styles.navButton}>
                        <ChevronLeft size={16} /> Predchádzajúci
                    </Link>
                    <Link href={nextLink} className={styles.navButton}>
                        Nasledujúci <ChevronRight size={16} />
                    </Link>
                </div>
            </div>

            <div className={styles.grid}>
                {weekDays.map(d => (
                    <div key={d} className={styles.dayHeader}>{d}</div>
                ))}

                {cells.map((cell, idx) => {
                    const cellEvents = getEventsForDay(cell.day, cell.type);
                    return (
                        <div key={idx} className={`${styles.dayCell} ${cell.type !== 'current' ? styles.otherMonth : ''} ${isToday(cell.day, cell.type) ? styles.today : ''}`}>
                            <span className={styles.dayNumber}>{cell.day}</span>
                            {cellEvents.map((evt, i) => (
                                <div
                                    key={i}
                                    className={`${styles.event} ${evt.isRegistered ? styles.registered : ''}`}
                                    title={`${evt.time} - ${evt.title} (${evt.trainer})${evt.isRegistered ? ' - ZAREGISTROVANÉ' : ''}`}
                                    onClick={() => setSelectedEvent(evt)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <strong>{evt.time}</strong> {evt.title}
                                </div>
                            ))}
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
                        </div>

                        {selectedEvent.isRegistered && (
                            <div style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                ✅ Na tento tréning ste prihlásený.
                            </div>
                        )}

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
                            <Link href="/dashboard/trainings">
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
                    </div>
                </div>
            )}
        </div>
    );
}
