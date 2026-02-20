'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styles from '@/components/dashboard/Calendar.module.css'; // Reusing styles

interface TrainingSession {
    id: string;
    time: string;
    title: string;
    trainer: string;
    date: Date;
    isRegistered?: boolean;
    totalCapacity?: number;
    bookedCount?: number;
    isIndividual?: boolean;
    isLocked?: boolean;
    deadlineMsg?: string;
    duration?: number;
}

const MobileDateHeader = ({ date }: { date: Date }) => {
    const dayName = date.toLocaleDateString('sk-SK', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' }).toUpperCase();

    // Capitalize first letter of day name
    const formattedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    return (
        <div className={styles.mobileDateHeader}>
            <span className={styles.headerDayName}>{formattedDayName}</span>
            <span className={styles.headerDate}>{dateStr}</span>
        </div>
    );
};

interface PublicCalendarProps {
    currentDate: Date;
    events: TrainingSession[];
}

export function PublicCalendar({ currentDate, events }: PublicCalendarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

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
                    let cellDate = new Date(year, month, cell.day);
                    if (cell.type === 'prev') cellDate = new Date(year, month - 1, cell.day);
                    if (cell.type === 'next') cellDate = new Date(year, month + 1, cell.day);

                    const cellEvents = events.filter(e => e.date.toDateString() === cellDate.toDateString());

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const checkDate = new Date(cellDate);
                    checkDate.setHours(0, 0, 0, 0);
                    const isPastDay = checkDate < today;

                    return (
                        <div
                            key={idx}
                            ref={isToday(cell.day, cell.type) ? todayRef : null}
                            className={`${styles.dayCell} ${cell.type !== 'current' ? styles.otherMonth : ''} ${isToday(cell.day, cell.type) ? styles.today : ''} ${isPastDay ? styles.pastDay : ''}`}
                            style={{ minHeight: '80px' }}
                        >
                            <div className={styles.mobileHeaderContainer}>
                                <MobileDateHeader date={cellDate} />
                            </div>

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

                                const booked = evt.bookedCount || 0;
                                const capacity = evt.totalCapacity || 10;

                                // If individual, use specific red logic
                                // If Locked (and empty), use grey/locked logic
                                const isLocked = evt.isLocked || false;

                                return (
                                    <div
                                        key={i}
                                        className={`${styles.event} ${booked >= capacity ? styles.full : ''}`}
                                        title={`${evt.time} - ${evt.title} (${booked}/${capacity})`}
                                        onClick={() => setSelectedEvent(evt)}
                                        style={{
                                            cursor: 'pointer',
                                            opacity: isPast ? 0.6 : 1,
                                            // Desktop inline overrides for specific states
                                            backgroundColor: evt.isIndividual
                                                ? '#FEF2F2'
                                                : isLocked
                                                    ? '#F3F4F6'
                                                    : undefined,
                                            borderLeft: evt.isIndividual
                                                ? '3px solid #DC2626'
                                                : isLocked
                                                    ? '3px solid #9CA3AF'
                                                    : undefined,
                                            color: evt.isIndividual
                                                ? '#DC2626'
                                                : isLocked
                                                    ? '#6B7280'
                                                    : undefined
                                        }}
                                    >
                                        {/* Mobile View Content */}
                                        <div className={styles.mobileEventContent}>
                                            <div className={styles.timeColumn}>
                                                <span className={styles.startTime}>{evt.time}</span>
                                                <span className={styles.duration}>{evt.duration || 60} min</span>
                                            </div>
                                            <div className={styles.detailsColumn}>
                                                <div className={styles.titleRow}>
                                                    <span className={styles.eventTitle}>{evt.title}</span>
                                                    <span
                                                        className={styles.levelBadge}
                                                        style={{
                                                            backgroundColor: booked >= capacity ? '#FEF2F2' : '#F3F4F6',
                                                            color: booked >= capacity ? '#DC2626' : '#374151',
                                                            border: booked >= capacity ? '1px solid #FECACA' : '1px solid #E5E7EB'
                                                        }}
                                                    >
                                                        Obsadenosť: {booked}/{capacity}
                                                    </span>
                                                </div>
                                                <div className={styles.trainerRow}>
                                                    <span className={styles.trainerName}>{evt.trainer}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Desktop View Content */}
                                        <div className={styles.desktopEventContent}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span><strong>{evt.time}</strong> {evt.title}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

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
                            <p style={{ marginBottom: '4px' }}>👤 Tréner: {selectedEvent.trainer}</p>

                            {selectedEvent.isIndividual ? (
                                <div style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem',
                                    backgroundColor: '#FEF2F2',
                                    borderRadius: '8px',
                                    border: '1px solid #fee2e2'
                                }}>
                                    <p style={{ margin: 0, fontWeight: 600, color: '#DC2626' }}>
                                        🔒 Individuálny tréning
                                    </p>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#991b1b' }}>
                                        Nie je možné sa prihlásiť online.
                                    </p>
                                </div>
                            ) : selectedEvent.isLocked ? (
                                <div style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem',
                                    backgroundColor: '#F3F4F6',
                                    borderRadius: '8px',
                                    border: '1px solid #E5E7EB'
                                }}>
                                    <p style={{ margin: 0, fontWeight: 600, color: '#4B5563' }}>
                                        ⏳ Prihlasovanie uzavreté
                                    </p>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
                                        Už nie je možné sa prihlásiť.
                                    </p>
                                </div>
                            ) : (
                                <div style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem',
                                    backgroundColor: (selectedEvent.bookedCount || 0) >= (selectedEvent.totalCapacity || 10) ? '#fef2f2' : '#f0fdf4',
                                    borderRadius: '8px',
                                    border: `1px solid ${(selectedEvent.bookedCount || 0) >= (selectedEvent.totalCapacity || 10) ? '#fee2e2' : '#dcfce7'}`
                                }}>
                                    <p style={{ margin: 0, fontWeight: 600, color: (selectedEvent.bookedCount || 0) >= (selectedEvent.totalCapacity || 10) ? '#991b1b' : '#166534' }}>
                                        {(selectedEvent.bookedCount || 0) >= (selectedEvent.totalCapacity || 10)
                                            ? 'PLNE OBSADENÉ'
                                            : `Voľné miesta: ${(selectedEvent.totalCapacity || 10) - (selectedEvent.bookedCount || 0)} z ${(selectedEvent.totalCapacity || 10)}`
                                        }
                                    </p>
                                </div>
                            )}
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
                            {!selectedEvent.isIndividual && (
                                <button
                                    onClick={() => handleBookClick(selectedEvent)}
                                    disabled={(selectedEvent.bookedCount || 0) >= (selectedEvent.totalCapacity || 10) || selectedEvent.isLocked}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: ((selectedEvent.bookedCount || 0) >= (selectedEvent.totalCapacity || 10) || selectedEvent.isLocked) ? '#ccc' : '#8C7568',
                                        color: 'white',
                                        cursor: ((selectedEvent.bookedCount || 0) >= (selectedEvent.totalCapacity || 10) || selectedEvent.isLocked) ? 'not-allowed' : 'pointer',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    Rezervovať
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
