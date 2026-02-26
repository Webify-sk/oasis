'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { Button } from '@/components/ui/Button';
import { Pencil, Trash2, Plus, Calendar as CalendarIcon, Clock, User, Phone, Mail, FileText } from 'lucide-react';
import { deleteAdminCosmeticAppointment } from '@/actions/cosmetic-actions';
import AdminReservationFormModal from './AdminReservationFormModal';
import { Modal } from '@/components/ui/Modal';

type Appointment = {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    notes?: string;
    client_name?: string;
    client_email?: string;
    client_phone?: string;
    cosmetic_services: { title: string; duration_minutes: number; price: number };
    employees: { name: string; color: string };
    profiles?: { full_name: string; email: string; phone: string };
};

export default function AdminReservationsManager({
    initialAppointments,
    services,
    employees
}: {
    initialAppointments: any[];
    services: any[];
    employees: any[];
}) {
    const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const showToast = (text: string, type: 'success' | 'error') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const confirmDelete = async () => {
        if (!appointmentToDelete) return;

        try {
            const result = await deleteAdminCosmeticAppointment(appointmentToDelete);
            if (result.error) {
                showToast(result.error, 'error');
            } else {
                showToast('Rezervácia bola vymazaná.', 'success');
                setAppointments(prev => prev.filter(app => app.id !== appointmentToDelete));
            }
        } catch (error) {
            showToast('Nastala chyba.', 'error');
        } finally {
            setAppointmentToDelete(null);
        }
    };

    const handleDeleteClick = (id: string) => {
        setAppointmentToDelete(id);
    };

    const handleCreate = () => {
        setEditingAppointment(null);
        setIsFormOpen(true);
    };

    const handleEdit = (appointment: Appointment) => {
        setEditingAppointment(appointment);
        setIsFormOpen(true);
    };

    const onFormSuccess = (updatedAppointment?: Appointment) => {
        setIsFormOpen(false);
        // We typically rely on Next.js revalidatePath to refresh data, 
        // but for immediate UI updates we could reload or manually update state.
        // For simplicity, let's just refresh the page data
        window.location.reload();
    };

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <div style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
                <Button onClick={handleCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                    <Plus size={18} />
                    NOVÁ REZERVÁCIA
                </Button>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflowX: 'auto', position: 'relative' }}>
                <table style={{ minWidth: '600px', width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', fontSize: '0.875rem' }}>Dátum a Čas</th>
                            <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', fontSize: '0.875rem' }}>Zamestnanec</th>
                            <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', fontSize: '0.875rem' }}>Služba</th>
                            <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', fontSize: '0.875rem' }}>Klient</th>
                            <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', fontSize: '0.875rem' }}>Poznámky</th>
                            <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', fontSize: '0.875rem', textAlign: 'right', position: 'sticky', right: 0, backgroundColor: '#f9fafb', zIndex: 10, borderLeft: '1px solid #e5e7eb' }}>Akcie</th>
                        </tr>
                    </thead>
                    <tbody>
                        {appointments.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                    Žiadne rezervácie.
                                </td>
                            </tr>
                        ) : (
                            appointments.map((app) => {
                                const startDate = new Date(app.start_time);
                                const endDate = new Date(app.end_time);

                                // Priority styling based on status could be added here
                                const clientName = app.profiles?.full_name || app.client_name || 'Neznámy klient';
                                const clientPhone = app.profiles?.phone || app.client_phone || '';
                                const clientEmail = app.profiles?.email || app.client_email || '';

                                return (
                                    <tr key={app.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '0.25rem' }}>
                                                {format(startDate, 'd. MMMM yyyy', { locale: sk })}
                                            </div>
                                            <div style={{ color: '#6b7280', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Clock size={14} />
                                                {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: app.employees?.color || '#ccc' }} />
                                                {app.employees?.name}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '500' }}>{app.cosmetic_services?.title}</div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{app.cosmetic_services?.duration_minutes} min</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                {clientName}
                                            </div>
                                            {clientPhone && <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} /> {clientPhone}</div>}
                                            {clientEmail && <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} /> {clientEmail}</div>}
                                        </td>
                                        <td style={{ padding: '1rem', maxWidth: '200px' }}>
                                            {app.notes ? (
                                                <div style={{ fontSize: '0.875rem', color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={app.notes}>
                                                    <FileText size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                                    {app.notes}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>---</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 10, borderLeft: '1px solid #f3f4f6' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleEdit(app)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '0.25rem' }}
                                                    title="Upraviť"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(app.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.25rem' }}
                                                    title="Zmazať"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {isFormOpen && (
                <AdminReservationFormModal
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    appointment={editingAppointment}
                    services={services}
                    employees={employees}
                    onSuccess={onFormSuccess}
                />
            )}

            {/* Custom Simple Toast */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    backgroundColor: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white',
                    padding: '1rem 1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 9999,
                    animation: 'fadeIn 0.3s ease-in-out',
                    fontFamily: 'var(--font-geist-sans)'
                }}>
                    {toastMessage.text}
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            <Modal
                isOpen={!!appointmentToDelete}
                onClose={() => setAppointmentToDelete(null)}
                title="Potvrdenie zmazania"
                actions={
                    <>
                        <Button variant="outline" onClick={() => setAppointmentToDelete(null)}>Zrušiť</Button>
                        <Button
                            style={{ backgroundColor: '#ef4444', color: 'white' }}
                            onClick={confirmDelete}
                        >
                            Áno, zmazať
                        </Button>
                    </>
                }
            >
                <p>Naozaj chcete natrvalo zmazať túto rezerváciu? Táto akcia sa nedá vrátiť späť.</p>
            </Modal>
        </div>
    );
}
