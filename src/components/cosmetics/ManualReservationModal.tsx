'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; 
import { X, Calendar, Clock, User, Mail, Phone, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { getCosmeticServices, getEmployeesForService, createManualReservation } from '@/actions/cosmetic-actions';
// import { toast } from 'sonner';

export function ManualReservationModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [selectedService, setSelectedService] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            loadServices();
            // Reset form
            setSelectedService('');
            setSelectedEmployee('');
            setDate('');
            setTime('');
            setClientName('');
            setClientEmail('');
            setClientPhone('');
            setNotes('');
            setIsSuccess(false);
            setError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedService) {
            loadEmployees(selectedService);
        } else {
            setEmployees([]);
        }
    }, [selectedService]);

    async function loadServices() {
        const data = await getCosmeticServices();
        setServices(data || []);
    }

    async function loadEmployees(serviceId: string) {
        const data = await getEmployeesForService(serviceId);
        setEmployees(data || []);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('serviceId', selectedService);
        formData.append('employeeId', selectedEmployee);
        formData.append('date', date);
        formData.append('time', time);
        formData.append('clientName', clientName);
        formData.append('clientEmail', clientEmail);
        formData.append('clientPhone', clientPhone);
        formData.append('notes', notes);

        const result = await createManualReservation(null, formData);

        setLoading(false);

        if (result?.error) {
            setError(result.error);
        } else {
            setIsSuccess(true);
            router.refresh();
            setTimeout(() => {
                setIsOpen(false);
                setIsSuccess(false);
            }, 2000);
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    backgroundColor: '#5E715D',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}
            >
                <Calendar size={18} />
                Vytvoriť rezerváciu
            </button>

            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        width: '90%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                                {isSuccess ? 'Hotovo!' : 'Nová rezervácia'}
                            </h2>
                            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {isSuccess ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#5E715D' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#def7ec', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#03543f' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>Rezervácia úspešná</h3>
                                <p style={{ color: '#666' }}>Rezervácia bola úspešne vytvorená.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                {error && (
                                    <div style={{
                                        backgroundColor: '#fee2e2',
                                        border: '1px solid #fecaca',
                                        color: '#991b1b',
                                        padding: '0.75rem',
                                        borderRadius: '6px',
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <AlertCircle size={18} />
                                        {error}
                                    </div>
                                )}

                                {/* Service & Employee */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Služba</label>
                                        <select
                                            required
                                            value={selectedService}
                                            onChange={(e) => setSelectedService(e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                        >
                                            <option value="">Vyberte službu</option>
                                            {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Zamestnanec</label>
                                        <select
                                            required
                                            value={selectedEmployee}
                                            onChange={(e) => setSelectedEmployee(e.target.value)}
                                            disabled={!selectedService}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: !selectedService ? '#f3f4f6' : 'white' }}
                                        >
                                            <option value="">Vyberte zamestnanca</option>
                                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Date & Time */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Dátum</label>
                                        <input
                                            type="date"
                                            required
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Čas</label>
                                        <select
                                            required
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                        >
                                            <option value="">Vyberte čas</option>
                                            {Array.from({ length: 33 }).map((_, i) => {
                                                const hour = Math.floor(i / 2) + 6; // Start at 06:00
                                                const minute = (i % 2) * 30;
                                                const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                                                return (
                                                    <option key={timeStr} value={timeStr}>
                                                        {timeStr}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid #e5e7eb', margin: '0.5rem 0' }}></div>

                                {/* Client Info (Optional) */}
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>Údaje o klientovi (Voliteľné)</h3>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Meno a priezvisko</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                        <input
                                            type="text"
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                            placeholder="Jozef Mrkvička"
                                            style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.2rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Email</label>
                                        <div style={{ position: 'relative' }}>
                                            <Mail size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                            <input
                                                type="email"
                                                value={clientEmail}
                                                onChange={(e) => setClientEmail(e.target.value)}
                                                placeholder="jozef@example.com"
                                                style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.2rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Telefón</label>
                                        <div style={{ position: 'relative' }}>
                                            <Phone size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                            <input
                                                type="tel"
                                                value={clientPhone}
                                                onChange={(e) => setClientPhone(e.target.value)}
                                                placeholder="+421 900 000 000"
                                                style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.2rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Poznámka</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    />
                                </div>

                                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: 500, cursor: 'pointer' }}
                                    >
                                        Zrušiť
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            backgroundColor: '#5E715D',
                                            color: 'white',
                                            fontWeight: 500,
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            opacity: loading ? 0.7 : 1,
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {loading && <Loader2 size={18} className="animate-spin" />}
                                        {loading ? 'Vytváram...' : 'Vytvoriť rezerváciu'}
                                    </button>
                                </div>

                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
