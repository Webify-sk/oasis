'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalIcon } from 'lucide-react';

interface Appointment {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    cosmetic_services: { title: string; duration_minutes: number; price: number } | null;
    employees: { name: string; color: string } | null;
    profiles: { full_name: string; email: string; phone: string } | null;
}

export function AppointmentCalendar({ initialAppointments }: { initialAppointments: Appointment[] }) {
    // Basic day view for MVP
    const [date, setDate] = useState(new Date());

    const formattedDate = date.toLocaleDateString('sk-SK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Filter for current day
    const dailyAppointments = initialAppointments.filter(app => {
        const appDate = new Date(app.start_time);
        return appDate.toDateString() === date.toDateString();
    });

    const nextDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        setDate(d);
    };

    const prevDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        setDate(d);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', backgroundColor: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #eee' }}>
                <button onClick={prevDay} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ChevronLeft /></button>
                <h2 style={{ fontSize: '1.2rem', margin: 0, textTransform: 'capitalize' }}>{formattedDate}</h2>
                <button onClick={nextDay} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ChevronRight /></button>
            </div>

            {dailyAppointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#888', backgroundColor: '#fafafa', borderRadius: '8px' }}>
                    <CalIcon size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>Žiadne rezervácie na tento deň.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {dailyAppointments.map(app => (
                        <div key={app.id} style={{
                            backgroundColor: 'white',
                            borderLeft: `4px solid ${app.employees?.color || '#5E715D'}`,
                            padding: '1.5rem',
                            borderRadius: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#333' }}>
                                        {new Date(app.start_time).toLocaleTimeString('sk-SK', { timeZone: 'Europe/Bratislava', hour: '2-digit', minute: '2-digit' })}
                                        {' - '}
                                        {new Date(app.end_time).toLocaleTimeString('sk-SK', { timeZone: 'Europe/Bratislava', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span style={{
                                        backgroundColor: '#f0f0f0',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        color: '#666'
                                    }}>
                                        {app.status}
                                    </span>
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#5E715D' }}>
                                    {app.cosmetic_services?.title || 'Neznáma služba'}
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                                    <User size={14} />
                                    <span>{app.profiles?.full_name || 'Neznámy klient'} ({app.profiles?.phone || 'Bez tel.'})</span>
                                </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.5rem' }}>
                                    {app.employees?.name}
                                </div>
                                <div style={{ fontWeight: 'bold' }}>
                                    {app.cosmetic_services?.price} €
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
