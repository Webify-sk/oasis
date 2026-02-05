'use client';

import { useState } from 'react';
import { format, startOfWeek, addDays, addMinutes, isSameDay, parseISO, startOfDay, getDay } from 'date-fns';
import { sk } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, User, Clock, Calendar as CalIcon } from 'lucide-react';
import { rescheduleAppointment } from '@/actions/cosmetic-actions';

interface Appointment {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    cosmetic_services: { title: string; duration_minutes: number; price: number } | null;
    employees: { id: string, name: string; color: string } | null;
    profiles: { full_name: string; phone: string | null } | null;
}

interface WeeklySchedulerProps {
    initialAppointments: Appointment[];
    employees: { id: string; name: string; color: string }[];
}

import { EditAppointmentModal } from './EditAppointmentModal';

export function WeeklyScheduler({ initialAppointments, employees }: WeeklySchedulerProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState(initialAppointments);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    // const [filterEmployee, setFilterEmployee] = useState<string>('all');

    // Refresh data (conceptually strictly we should re-fetch via server action or router.refresh(), 
    // but for now let's assume parent revalidates or we trigger router.refresh)
    // Actually, cosmetic-actions reschedule does revalidatePath.
    // So we just need to perhaps refresh the router?
    // Let's use router
    // import { useRouter } from 'next/navigation';
    // const router = useRouter(); ... router.refresh();
    // But since `appointments` is state, we might need to update it optimistically or wait for refresh.
    // For simplicity, let's just use router.refresh() in onUpdate.

    // ... rest of logic ...

    // IMPORTANT: Adding router usage
    // const router = useRouter(); // Moved to top level import if needed, but let's assume we add it.

    const handleUpdate = () => {
        // Force reload to get fresh data
        window.location.reload(); // Simple brute force for now, or router.refresh()
    };

    // Calendar Settings
    const startHour = 8;
    const endHour = 20;
    const hourHeight = 60; // px

    // Week calculations
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
    const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
    const handleToday = () => setCurrentDate(new Date());

    // Calculate position for an event
    const getEventStyle = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);

        const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
        const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

        const dayStartMinutes = startHour * 60;

        const top = ((startMinutes - dayStartMinutes) / 60) * hourHeight;
        const height = ((endMinutes - startMinutes) / 60) * hourHeight;

        return {
            top: `${top}px`,
            height: `${height}px`,
        };
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20} /></button>
                    <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20} /></button>
                    <h2 style={{ fontSize: '1.5rem', fontFamily: 'serif', margin: 0, minWidth: '200px', textAlign: 'center' }}>
                        {format(currentDate, 'MMMM yyyy', { locale: sk })}
                    </h2>
                    <button onClick={handleToday} style={{ marginLeft: '1rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>
                        Dnes
                    </button>
                </div>

                {/* Employee Filter could go here */}
            </div>

            {/* Grid */}
            <div style={{ display: 'flex', overflowX: 'auto' }}>
                {/* Time Column */}
                <div style={{ width: '60px', flexShrink: 0, borderRight: '1px solid #eee' }}>
                    <div style={{ height: '50px', borderBottom: '1px solid #eee' }}></div> {/* Header spacer */}
                    {Array.from({ length: endHour - startHour + 1 }).map((_, i) => (
                        <div key={i} style={{ height: `${hourHeight}px`, borderBottom: '1px solid #f9f9f9', fontSize: '0.8rem', color: '#999', textAlign: 'center', position: 'relative', top: '-10px' }}>
                            {startHour + i}:00
                        </div>
                    ))}
                </div>

                {/* Days Columns */}
                <div style={{ flex: 1, display: 'flex', minWidth: '800px' }}>
                    {weekDays.map(day => {
                        const isToday = isSameDay(day, new Date());
                        const dayEvents = appointments.filter(app => isSameDay(new Date(app.start_time), day) && app.status !== 'cancelled');

                        return (
                            <div key={day.toISOString()} style={{ flex: 1, borderRight: '1px solid #eee', minWidth: '120px' }}>
                                {/* Day Header */}
                                <div style={{
                                    height: '50px',
                                    borderBottom: '1px solid #eee',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isToday ? '#f0fdf4' : 'transparent'
                                }}>
                                    <span style={{ fontSize: '0.8rem', color: isToday ? '#166534' : '#666', fontWeight: 600 }}>{format(day, 'EEEE', { locale: sk })}</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? '#166534' : '#333' }}>{format(day, 'd')}</span>
                                </div>

                                {/* Timeline */}
                                <div style={{ position: 'relative', height: `${(endHour - startHour) * hourHeight + hourHeight}px` }}> {/* Extra hour for buffer */}
                                    {/* Grid Lines */}
                                    {Array.from({ length: endHour - startHour + 1 }).map((_, i) => (
                                        <div key={i} style={{ height: `${hourHeight}px`, borderBottom: '1px solid #f9f9f9' }}></div>
                                    ))}

                                    {/* Events */}
                                    {dayEvents.map(app => {
                                        const style = getEventStyle(app.start_time, app.end_time);
                                        return (
                                            <div key={app.id} style={{
                                                position: 'absolute',
                                                ...style,
                                                left: '2px',
                                                right: '2px',
                                                backgroundColor: app.employees?.color ? `${app.employees.color}20` : '#e3f2fd',
                                                borderLeft: `3px solid ${app.employees?.color || '#2196f3'}`,
                                                borderRadius: '4px',
                                                padding: '4px',
                                                fontSize: '0.75rem',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                zIndex: 10
                                            }}
                                                onClick={() => setSelectedAppointment(app)}
                                            >
                                                <div style={{ fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {app.profiles?.full_name || 'Hosť'}
                                                </div>
                                                <div style={{ color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {app.cosmetic_services?.title}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: '#777' }}>
                                                    {format(new Date(app.start_time), 'HH:mm')}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedAppointment && (
                <EditAppointmentModal
                    appointment={selectedAppointment}
                    onClose={() => setSelectedAppointment(null)}
                    onUpdate={handleUpdate}
                />
            )}
        </div>
    );
}
