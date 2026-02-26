'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';
import { createAdminCosmeticAppointment, updateAdminCosmeticAppointment } from '@/actions/cosmetic-actions';

export default function AdminReservationFormModal({
    isOpen,
    onClose,
    appointment,
    services,
    employees,
    onSuccess
}: {
    isOpen: boolean;
    onClose: () => void;
    appointment?: any;
    services: any[];
    employees: any[];
    onSuccess: () => void;
}) {
    const isEdit = !!appointment;

    const [loading, setLoading] = useState(false);
    const [serviceId, setServiceId] = useState(appointment?.service_id || (services.length > 0 ? services[0].id : ''));
    const [employeeId, setEmployeeId] = useState(appointment?.employee_id || (employees.length > 0 ? employees[0].id : ''));
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [notes, setNotes] = useState(appointment?.notes || '');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Client Info
    const [clientName, setClientName] = useState(appointment?.client_name || appointment?.profiles?.full_name || '');
    const [clientPhone, setClientPhone] = useState(appointment?.client_phone || appointment?.profiles?.phone || '');
    const [clientEmail, setClientEmail] = useState(appointment?.client_email || appointment?.profiles?.email || '');

    useEffect(() => {
        if (appointment) {
            // Using Intl formatter to guarantee we slice out exactly what is in Bratislava context
            const formatter = new Intl.DateTimeFormat('sv-SE', {
                timeZone: 'Europe/Bratislava',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            });
            const startStr = formatter.format(new Date(appointment.start_time));
            const endStr = formatter.format(new Date(appointment.end_time));

            setDate(startStr.split(' ')[0]);
            setStartTime(startStr.split(' ')[1].substring(0, 5));
            setEndTime(endStr.split(' ')[1].substring(0, 5));
        } else {
            // Default to today
            const formatter = new Intl.DateTimeFormat('sv-SE', {
                timeZone: 'Europe/Bratislava',
                year: 'numeric', month: '2-digit', day: '2-digit'
            });
            setDate(formatter.format(new Date()));
        }
    }, [appointment]);

    // Handle service change to auto-calculate end time based on duration (only relevant for Create, or if changing service during edit)
    const handleServiceOrTimeChange = (newServiceId: string, newStartTime: string) => {
        const service = services.find(s => s.id === newServiceId);
        if (service && newStartTime) {
            const [hours, minutes] = newStartTime.split(':').map(Number);
            const duration = service.duration_minutes;

            let totalMinutes = hours * 60 + minutes + duration;
            const endH = Math.floor(totalMinutes / 60) % 24;
            const endM = totalMinutes % 60;

            setEndTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
        }
    };

    // Derived filtered services based on the selected employee
    const selectedEmployeeObj = employees.find(e => e.id === employeeId);
    const assignedServiceIds = selectedEmployeeObj?.service_ids || [];

    // Admin services list filtered by the employee's assigned services. 
    // Usually, admins can book any service if needed, but the user requested strictly employee's services.
    const availableServices = services.filter(s => assignedServiceIds.includes(s.id));

    // If the employee changes and they don't perform the currently selected service, reset it.
    useEffect(() => {
        if (employeeId && availableServices.length > 0) {
            const currentServiceStillValid = availableServices.some(s => s.id === serviceId);
            if (!currentServiceStillValid) {
                setServiceId(availableServices[0].id);
                handleServiceOrTimeChange(availableServices[0].id, startTime);
            }
        } else if (availableServices.length === 0) {
            setServiceId('');
            setEndTime('');
        }
    }, [employeeId]); // DO NOT include availableServices/serviceId/startTime in dependencies to avoid infinite loops

    const handleServiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setServiceId(val);
        handleServiceOrTimeChange(val, startTime);
    };

    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setStartTime(val);
        handleServiceOrTimeChange(serviceId, val);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setErrorMessage('');
        setSuccessMessage('');

        if (!date || !startTime || !endTime) {
            setErrorMessage('Prosím vyplňte dátum a čas (od - do).');
            return;
        }

        setLoading(true);

        // Build ISO string in Europe/Bratislava timezone correctly
        // Example: 2024-10-30T14:10:00.000+01:00 (or +02:00 for DST)
        // We can construct this strictly by using Date.parse, or let the server action handle the string.
        // Since our backend generally expects UTC ISO strings (Z), we need to ensure "14:10" local time
        // correctly translates to "13:10Z" (winter) or "12:10Z" (summer) without double-shifting.

        try {
            // Build ISO string in Europe/Bratislava timezone correctly
            const startDateTimeStr = `${date}T${startTime}:00`;
            const endDateTimeStr = `${date}T${endTime}:00`;

            const getBratislavaOffsetString = (dateStr: string) => {
                const d = new Date(dateStr); // Close enough to get the right DST offset for that day
                const formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Europe/Bratislava',
                    timeZoneName: 'longOffset'
                });
                const parts = formatter.formatToParts(d);
                let offset = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+01:00';
                offset = offset.replace('GMT', '');
                if (offset === '') offset = 'Z';
                return `${dateStr}${offset}`;
            };

            const startUTC = new Date(getBratislavaOffsetString(startDateTimeStr)).toISOString();
            const endUTC = new Date(getBratislavaOffsetString(endDateTimeStr)).toISOString();

            const data = {
                service_id: serviceId,
                employee_id: employeeId,
                start_time: startUTC,
                end_time: endUTC,
                notes,
                client_name: clientName,
                client_phone: clientPhone,
                client_email: clientEmail
            };

            let result;
            if (isEdit) {
                result = await updateAdminCosmeticAppointment(appointment.id, data);
            } else {
                result = await createAdminCosmeticAppointment(data);
            }

            if (result.error) {
                setErrorMessage(result.error);
            } else {
                setSuccessMessage(isEdit ? 'Rezervácia bola úspešne upravená.' : 'Rezervácia bola úspešne vytvorená.');
                setTimeout(() => onSuccess(), 1500); // Give user time to see the success message
            }
        } catch (error) {
            setErrorMessage('Vyskytla sa nečakaná chyba.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '600px',
                maxHeight: '90vh', overflowY: 'auto'
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937', fontFamily: 'var(--font-heading)' }}>
                        {isEdit ? 'Upraviť Rezerváciu' : 'Pridať Rezerváciu (Admin)'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>

                    {errorMessage && (
                        <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                            {errorMessage}
                        </div>
                    )}

                    {successMessage && (
                        <div style={{ backgroundColor: '#d1fae5', color: '#047857', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                            {successMessage}
                        </div>
                    )}

                    {/* Zamestnanec & Sluzba */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Zamestnanec</label>
                            <select
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                required
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}
                            >
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name || e.id}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Služba</label>
                            <select
                                value={serviceId}
                                onChange={handleServiceSelect}
                                required
                                disabled={availableServices.length === 0}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: availableServices.length === 0 ? '#f3f4f6' : 'white' }}
                            >
                                {availableServices.length > 0 ? (
                                    availableServices.map(s => <option key={s.id} value={s.id}>{s.title} ({s.duration_minutes} min)</option>)
                                ) : (
                                    <option value="" disabled>Zamestnanec nemá priradené služby</option>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Datum a cas */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Dátum</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Čas Od</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={handleStartTimeChange}
                                required
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Čas Do</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                        </div>
                        {!isEdit && (
                            <div style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: '#d97706', marginTop: '0.5rem' }}>
                                * Admin rezervácia ignoruje obmedzenia pracovného času zamestnanca a môže byť vytvorená aj mimo vyhradených hodín.
                            </div>
                        )}
                    </div>

                    <hr style={{ borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#374151', fontFamily: 'var(--font-heading)' }}>Informácie o Klientovi (Voliteľné)</h3>

                    {/* Klient - Name & Phone */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Meno Klienta</label>
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Jozef Čmrko"
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Telefón</label>
                            <input
                                type="text"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                placeholder="+421 9xx xxx xxx"
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                        </div>
                    </div>

                    {/* Klient - Email */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Email</label>
                        <input
                            type="email"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            placeholder="jozef@example.com"
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                        />
                    </div>

                    {/* Poznamka */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Poznámka</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'vertical' }}
                            placeholder="Špeciálne požiadavky..."
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Zrušiť
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Ukladám...' : (isEdit ? 'Uložiť Zmeny' : 'Vytvoriť Rezerváciu')}
                        </Button>
                    </div>

                </form>
            </div>
        </div>
    );
}
