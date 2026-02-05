'use client';

import { useState } from 'react';
import { X, Clock, Calendar, User, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { rescheduleAppointment, cancelAppointment } from '@/actions/cosmetic-actions';
import { Button } from '@/components/ui/Button';

interface Appointment {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    cosmetic_services: { title: string; duration_minutes: number; price: number } | null;
    employees: { id: string, name: string; color: string } | null;
    profiles: { full_name: string; phone: string | null } | null;
}

interface EditAppointmentModalProps {
    appointment: Appointment;
    onClose: () => void;
    onUpdate: () => void; // Trigger refresh
}

export function EditAppointmentModal({ appointment, onClose, onUpdate }: EditAppointmentModalProps) {
    const [date, setDate] = useState(format(new Date(appointment.start_time), 'yyyy-MM-dd'));
    const [time, setTime] = useState(format(new Date(appointment.start_time), 'HH:mm'));
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const startDateTime = new Date(`${date}T${time}`);
            const duration = appointment.cosmetic_services?.duration_minutes || 60;
            const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

            const result = await rescheduleAppointment(
                appointment.id,
                startDateTime.toISOString(),
                endDateTime.toISOString()
            );

            if (result.success) {
                onUpdate();
                onClose();
            } else {
                alert('Chyba pri zmene termínu');
            }
        } catch (e) {
            console.error(e);
            alert('Nastala chyba');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Naozaj chcete zrušiť túto rezerváciu?')) return;

        setIsLoading(true);
        try {
            // Re-using cancelAppointment but logic might be 'cancel by admin'?
            // cosmetic-actions cancelAppointment checks user ownership.
            // We need an admin version or ensure this works for employees.
            // Let's assume for now we use rescheduleAppointment to set status 'cancelled'?
            // Or create a new action `cancelAppointmentAdmin`.
            // For now, let's just close.
            alert('Cancel functionality for admin/employee pending.');
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'serif' }}>Upraviť rezerváciu</h2>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X /></button>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#5E715D' }}>{appointment.cosmetic_services?.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#666' }}>
                        <User size={16} />
                        <span>{appointment.profiles?.full_name}</span>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>Dátum</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>Čas</label>
                        <input
                            type="time"
                            value={time}
                            onChange={e => setTime(e.target.value)}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    {/* 
                    <button 
                        onClick={handleCancel}
                        disabled={isLoading}
                        style={{ padding: '0.8rem', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        <Trash2 size={18} />
                    </button>
                    */}
                    <div style={{ flex: 1 }}></div>

                    <Button variant="outline" onClick={onClose} disabled={isLoading} style={{ marginRight: '0.5rem' }}>
                        Zrušiť
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? 'Ukladám...' : 'Uložiť zmeny'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
