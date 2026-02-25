import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    isBefore,
    startOfDay
} from 'date-fns';
import { sk } from 'date-fns/locale';

interface CalendarProps {
    selectedDate: string;
    onDateSelect: (date: string) => void;
    minDate?: string;
    availableDates?: string[];
    onMonthChange?: (year: number, month: number) => void;
}

export function Calendar({ selectedDate, onDateSelect, minDate, availableDates = [], onMonthChange }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(
        selectedDate ? new Date(selectedDate) : new Date()
    );

    const selectedDateObj = selectedDate ? new Date(selectedDate) : null;
    const minDateObj = minDate ? new Date(minDate) : startOfDay(new Date());

    useEffect(() => {
        if (onMonthChange) {
            onMonthChange(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
        }
    }, [currentMonth]);

    const renderHeader = () => {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                padding: '0 0.5rem'
            }}>
                <div style={{
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    color: '#333',
                    textTransform: 'capitalize'
                }}>
                    {format(currentMonth, 'LLLL yyyy', { locale: sk })}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%', transition: 'background-color 0.2s',
                            color: '#666'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%', transition: 'background-color 0.2s',
                            color: '#666'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 }); // Start on Monday

        for (let i = 0; i < 7; i++) {
            days.push(
                <div
                    key={i}
                    style={{
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: '#666',
                        fontSize: '0.85rem',
                        padding: '0.5rem 0',
                        textTransform: 'uppercase' // Match mockup
                    }}
                >
                    {format(addDays(startDate, i), 'E', { locale: sk }).replace('.', '')}
                </div>
            );
        }

        return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.5rem' }}>{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const dateFormat = 'd';
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = '';

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;

                const isSelected = selectedDateObj && isSameDay(day, selectedDateObj);
                const isPast = isBefore(day, minDateObj);
                const isCurrentMonth = isSameMonth(day, monthStart);

                days.push(
                    <div
                        key={day.toString()}
                        onClick={() => {
                            if (!isPast) {
                                // Convert to local ISO string YYYY-MM-DD
                                const offset = cloneDay.getTimezoneOffset()
                                const localDate = new Date(cloneDay.getTime() - (offset * 60 * 1000))
                                onDateSelect(localDate.toISOString().split('T')[0]);
                            }
                        }}
                        style={{
                            padding: '0.2rem', // Reduced padding for mobile
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexDirection: 'column'
                        }}
                    >
                        <div style={{
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: '8px', // Match mockup squircle
                            cursor: isPast ? 'not-allowed' : 'pointer',
                            backgroundColor: isSelected ? '#3b82f6' : 'transparent', // Blue from mockup
                            color: isSelected ? 'white' : (!isCurrentMonth || isPast) ? '#d1d5db' : '#333',
                            fontWeight: isSelected ? 'bold' : 'normal',
                            transition: 'all 0.2s',
                            position: 'relative'
                        }}
                            onMouseEnter={(e) => {
                                if (!isPast && !isSelected) {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isPast && !isSelected) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <span>{formattedDate}</span>
                            {/* Green dot indicator for available dates */}
                            {(() => {
                                const offset = cloneDay.getTimezoneOffset();
                                const localDateStr = new Date(cloneDay.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
                                if (availableDates.includes(localDateStr) && !isPast && !isSelected) {
                                    return (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '4px',
                                            width: '4px',
                                            height: '4px',
                                            borderRadius: '50%',
                                            backgroundColor: '#10b981' // Green indicator
                                        }} />
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div key={day.toString()} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div>{rows}</div>;
    };

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1rem 0.5rem', // Reduced side padding
            width: '100%',
            maxWidth: '350px',
            margin: '0 auto', // Center it
            boxSizing: 'border-box'
        }}>
            {renderHeader()}
            {renderDays()}
            {renderCells()}
        </div>
    );
}
