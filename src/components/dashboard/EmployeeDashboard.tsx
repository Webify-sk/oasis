'use client';

import Link from 'next/link';
import { Calendar, Clock, User, Plus, Sparkles, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useState, useEffect } from 'react';
// import { Modal } from '@/components/ui/Modal'; // Using inline for robustness
import { updateAppointmentStatus, rescheduleAppointment } from '@/actions/cosmetic-actions';
import { useRouter } from 'next/navigation';

interface Appointment {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    cosmetic_services: {
        title: string;
        price: number;
        duration_minutes: number;
    };
    profiles: {
        full_name: string;
        phone: string | null;
    };
}

export function EmployeeDashboard({ appointments, employeeName, activeServicesCount }: { appointments: Appointment[], employeeName: string, activeServicesCount: number }) {
    const today = new Date();
    const router = useRouter();
    // Filter active/upcoming
    const upcoming = appointments.filter(a => new Date(a.start_time) >= today && a.status !== 'cancelled').slice(0, 5);
    const todayAppointments = appointments.filter(a => new Date(a.start_time).toDateString() === new Date().toDateString() && a.status !== 'cancelled');

    const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
    const [newDate, setNewDate] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        console.log('Dashboard mounted. Selected app:', selectedApp);
    }, [selectedApp]);

    const handleCancel = async (id: string) => {
        if (!confirm('Naozaj chcete zrušiť túto rezerváciu?')) return;

        setIsUpdating(true);
        await updateAppointmentStatus(id, 'cancelled');
        setIsUpdating(false);
        router.refresh();
    };

    const openReschedule = (app: Appointment) => {
        console.log('Opening reschedule for:', app.id);
        const d = new Date(app.start_time);
        // Correct timezone offset for datetime-local (local time)
        const offset = d.getTimezoneOffset() * 60000;
        const localIso = new Date(d.getTime() - offset).toISOString().slice(0, 16);

        setSelectedApp(app);
        setNewDate(localIso);
    };

    const handleRescheduleSubmit = async () => {
        if (!selectedApp || !newDate) return;

        setIsUpdating(true);

        // Calculate new end time
        const start = new Date(newDate);
        const duration = selectedApp.cosmetic_services.duration_minutes;
        const end = new Date(start.getTime() + duration * 60000);

        const res = await rescheduleAppointment(selectedApp.id, start.toISOString(), end.toISOString());

        setIsUpdating(false);
        if (res?.success) {
            setSelectedApp(null);
            router.refresh();
        } else {
            alert('Nepodarilo sa zmeniť termín.');
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'var(--font-sans, sans-serif)' }}>

            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '3rem' }}>
                <div>
                    <p style={{ textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.1em', color: '#888', marginBottom: '0.5rem' }}>
                        {format(new Date(), 'd. MMMM yyyy', { locale: sk })}
                    </p>
                    <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2.5rem', color: '#2c3e50', margin: 0 }}>
                        Vitajte, {employeeName.split(' ')[0]}
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', color: '#888' }}>Pracovná doba dnes</div>
                        <div style={{ fontWeight: '500', color: '#2c3e50' }}>09:00 - 17:00</div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>

                {/* Left Column - Stats & Actions (4 cols) */}
                <div style={{ gridColumn: 'span 12' }} className="lg-col-span-4">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Today's Overview Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, #5E715D 0%, #4a5c49 100%)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            color: 'white',
                            boxShadow: '0 10px 20px rgba(94, 113, 93, 0.2)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9, fontWeight: 'normal' }}>Dnešné termíny</h3>
                                    <div style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: 1 }}>{todayAppointments.length}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                                    <Calendar size={24} color="white" />
                                </div>
                            </div>
                            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                {todayAppointments.length === 0 ? 'Dnes máte voľno.' : 'Klienti čakajú na vašu starostlivosť.'}
                            </div>
                        </div>

                        {/* Active Services Card */}
                        <div style={{
                            padding: '1.5rem',
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.03)',
                            border: '1px solid #eee'
                        }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#5E715D', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aktívne služby</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2c3e50' }}>{activeServicesCount}</div>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#95a5a6' }}>Dostupné pre klientov</p>
                        </div>

                        {/* Quick Actions */}
                        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #f0f0f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rýchle akcie</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <Link href="/dashboard/cosmetics/services" style={{ textDecoration: 'none' }}>
                                    <button style={{
                                        width: '100%', padding: '1rem', borderRadius: '10px', border: '1px solid #eee',
                                        background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem',
                                        transition: 'all 0.2s', color: '#444'
                                    }}>
                                        <div style={{ background: '#f5f5f5', padding: '0.5rem', borderRadius: '6px' }}><Settings size={18} color="#5E715D" /></div>
                                        <span style={{ fontWeight: 500 }}>Spravovať služby</span>
                                    </button>
                                </Link>
                                <Link href="/dashboard/cosmetics/availability" style={{ textDecoration: 'none' }}>
                                    <button style={{
                                        width: '100%', padding: '1rem', borderRadius: '10px', border: '1px solid #eee',
                                        background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem',
                                        transition: 'all 0.2s', color: '#444'
                                    }}>
                                        <div style={{ background: '#f5f5f5', padding: '0.5rem', borderRadius: '6px' }}><Clock size={18} color="#5E715D" /></div>
                                        <span style={{ fontWeight: 500 }}>Pracovná doba</span>
                                    </button>
                                </Link>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right Column - Schedule (8 cols) */}
                <div style={{ gridColumn: 'span 12' }} className="lg-col-span-8">
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontFamily: 'Georgia, serif', color: '#2c3e50', margin: 0 }}>
                                Nadchádzajúce rezervácie
                            </h2>
                            <Link href="/dashboard/cosmetics/calendar" style={{ color: '#5E715D', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
                                Zobraziť kalendár →
                            </Link>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {upcoming.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                                    <p>Momentálne nemáte žiadne nadchádzajúce rezervácie.</p>
                                </div>
                            ) : (
                                upcoming.map((app, index) => {
                                    const isNext = index === 0;
                                    return (
                                        <div key={app.id} style={{
                                            display: 'flex', alignItems: 'center', padding: '1.2rem',
                                            borderRadius: '12px', border: isNext ? '1px solid #5E715D' : '1px solid #eee',
                                            background: isNext ? '#f9fbf9' : 'white',
                                            transition: 'transform 0.2s'
                                        }}>
                                            {/* Time Column */}
                                            <div style={{ paddingRight: '1.5rem', borderRight: '1px solid #eee', marginRight: '1.5rem', minWidth: '80px', textAlign: 'center' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#2c3e50' }}>
                                                    {format(new Date(app.start_time), 'HH:mm')}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>
                                                    {format(new Date(app.start_time), 'EEE', { locale: sk })}
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>{app.profiles?.full_name || 'Neznámy klient'}</h4>
                                                    <div style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        {/* Actions */}
                                                        {app.status !== 'cancelled' && (
                                                            <>
                                                                <button
                                                                    onClick={() => openReschedule(app)}
                                                                    style={{
                                                                        padding: '0.3rem 0.6rem', border: '1px solid #ddd', borderRadius: '6px',
                                                                        background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#2c3e50'
                                                                    }}
                                                                    title="Zmeniť termín"
                                                                >
                                                                    📅
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCancel(app.id)}
                                                                    style={{
                                                                        padding: '0.3rem 0.6rem', border: '1px solid #fecaca', borderRadius: '6px',
                                                                        background: '#fef2f2', cursor: 'pointer', fontSize: '0.8rem', color: '#dc2626'
                                                                    }}
                                                                    title="Zrušiť rezerváciu"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </>
                                                        )}

                                                        <span style={{
                                                            padding: '0.3rem 0.8rem',
                                                            borderRadius: '20px',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: app.status === 'confirmed' ? '#e8f5e9' : (app.status === 'cancelled' ? '#fee2e2' : '#fff3e0'),
                                                            color: app.status === 'confirmed' ? '#2e7d32' : (app.status === 'cancelled' ? '#991b1b' : '#f57c00'),
                                                            fontWeight: 600,
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}>
                                                            {app.status === 'confirmed' ? 'Potvrdené' : (app.status === 'cancelled' ? 'Zrušené' : 'Čaká')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{ color: '#666', fontSize: '0.95rem' }}>
                                                    {app.cosmetic_services?.title}
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#999' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> {app.cosmetic_services?.duration_minutes} min</span>
                                                    {app.profiles?.phone && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><User size={14} /> {app.profiles.phone}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @media (min-width: 1024px) {
                    .lg-col-span-8 { grid-column: span 8 !important; }
                    .lg-col-span-4 { grid-column: span 4 !important; }
                }
            `}</style>
        </div>
    );
}
