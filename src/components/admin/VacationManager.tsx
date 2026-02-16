'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/Button';
import { Trash2, Plus, Calendar } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface Vacation {
    id: string;
    start_time: string;
    end_time: string;
    description: string | null;
}

export function VacationManager() {
    // State
    const [vacations, setVacations] = useState<Vacation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        startDate: '',
        startTime: '08:00',
        endDate: '',
        endTime: '20:00',
        description: ''
    });

    const supabase = createClient();

    // Fetch
    const fetchVacations = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('vacations')
            .select('*')
            .order('start_time', { ascending: true });

        if (error) {
            console.error('Error fetching vacations:', error);
        } else {
            setVacations(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchVacations();
    }, []);

    // Handlers
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Construct UTC Face Value dates to match app convention
            // We want "2026-02-26 08:00" input to be stored as "2026-02-26T08:00:00.000Z"
            const [startYear, startMonth, startDay] = formData.startDate.split('-').map(Number);
            const [startHour, startMinute] = formData.startTime.split(':').map(Number);

            const [endYear, endMonth, endDay] = formData.endDate.split('-').map(Number);
            const [endHour, endMinute] = formData.endTime.split(':').map(Number);

            const start = new Date(Date.UTC(startYear, startMonth - 1, startDay, startHour, startMinute)).toISOString();
            const end = new Date(Date.UTC(endYear, endMonth - 1, endDay, endHour, endMinute)).toISOString();

            const { error } = await supabase.from('vacations').insert({
                start_time: start,
                end_time: end,
                description: formData.description
            });

            if (error) throw error;

            setShowAddModal(false);
            setFormData({ startDate: '', startTime: '08:00', endDate: '', endTime: '20:00', description: '' });
            fetchVacations();
        } catch (error: any) {
            alert('Chyba pri vytváraní dovolenky: ' + (error.message || error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;

        try {
            const { error } = await supabase.from('vacations').delete().eq('id', deletingId);
            if (error) throw error;
            setDeletingId(null);
            fetchVacations();
        } catch (error: any) {
            alert('Chyba pri mazaní: ' + (error.message || error));
        }
    };

    // Render
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontFamily: 'serif', color: '#4A403A' }}>Správa dovoleniek</h2>
                <Button onClick={() => setShowAddModal(true)}>
                    <Plus size={18} style={{ marginRight: '0.5rem' }} />
                    Pridať dovolenku / Voľno
                </Button>
            </div>

            {/* List */}
            <div style={{ display: 'grid', gap: '1rem' }}>
                {vacations.map(vacation => (
                    <div key={vacation.id} style={{
                        backgroundColor: '#fff',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        border: '1px solid #E5E0DD',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Calendar size={16} color="#4A403A" />
                                <span style={{ fontWeight: 600, color: '#4A403A' }}>
                                    {/* Display as UTC to match the stored "Face Value" */}
                                    {new Date(vacation.start_time).toLocaleDateString('sk-SK', { timeZone: 'UTC' })} {new Date(vacation.start_time).toLocaleTimeString('sk-SK', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}
                                    {' - '}
                                    {new Date(vacation.end_time).toLocaleDateString('sk-SK', { timeZone: 'UTC' })} {new Date(vacation.end_time).toLocaleTimeString('sk-SK', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            {vacation.description && (
                                <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>{vacation.description}</p>
                            )}
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => setDeletingId(vacation.id)}
                            style={{ backgroundColor: '#fef2f2', color: '#991b1b', borderColor: '#fee2e2' }}
                        >
                            <Trash2 size={16} />
                        </Button>
                    </div>
                ))}
                {vacations.length === 0 && !isLoading && (
                    <p style={{ fontStyle: 'italic', color: '#999', textAlign: 'center' }}>Žiadne naplánované dovolenky.</p>
                )}
            </div>

            {/* Add Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Pridať nové voľno">
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Dátum od</label>
                            <input
                                type="date"
                                required
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Čas od</label>
                            <input
                                type="time"
                                required
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Dátum do</label>
                            <input
                                type="date"
                                required
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Čas do</label>
                            <input
                                type="time"
                                required
                                value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Poznámka (nepovinné)</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                            placeholder="Napr. Sviatky"
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Zrušiť</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Ukladám...' : 'Uložiť'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                title="Vymazať dovolenku"
                actions={
                    <>
                        <Button variant="ghost" onClick={() => setDeletingId(null)}>
                            Zrušiť
                        </Button>
                        <Button variant="primary" style={{ backgroundColor: '#991b1b', borderColor: '#991b1b' }} onClick={handleDelete}>
                            Vymazať
                        </Button>
                    </>
                }
            >
                <p>Naozaj chcete vymazať túto dovolenku?</p>
            </Modal>
        </div>
    );
}
