'use client';

import { useState, useEffect } from 'react';
import { updateWeeklyAvailability, addAvailabilityException, removeAvailabilityException, getAvailabilityExceptions } from '@/actions/cosmetic-actions';
import { Clock, Check, Calendar, Plus, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

interface AvailabilitySlot {
    id?: string;
    day_of_week: number;
    start_time: string | null;
    end_time: string | null;
    is_available: boolean;
    is_recurring: boolean;
}

interface Exception {
    id: string;
    exception_date: string;
    is_available: boolean;
    start_time: string | null;
    end_time: string | null;
    reason: string | null;
}

const DAYS = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];

export function AvailabilityManager({
    employeeId,
    initialAvailability
}: {
    employeeId: string,
    initialAvailability: AvailabilitySlot[]
}) {
    const [schedule, setSchedule] = useState<AvailabilitySlot[]>(() => {
        // Ensure at least one slot exists for each day, or use initial
        const slots: AvailabilitySlot[] = [];
        for (let i = 0; i < 7; i++) {
            const daySlots = initialAvailability.filter(s => s.day_of_week === i && s.is_recurring);
            if (daySlots.length > 0) {
                slots.push(...daySlots);
            } else {
                // Default slot for this day (unavailable)
                slots.push({
                    day_of_week: i,
                    start_time: '09:00',
                    end_time: '17:00',
                    is_available: false,
                    is_recurring: true
                });
            }
        }
        return slots;
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Exceptions State
    const [exceptions, setExceptions] = useState<Exception[]>([]);
    const [newExceptionDate, setNewExceptionDate] = useState('');
    const [isExceptionAvailable, setIsExceptionAvailable] = useState(false);
    const [exceptionStart, setExceptionStart] = useState('09:00');
    const [exceptionEnd, setExceptionEnd] = useState('17:00');
    const [isAddingException, setIsAddingException] = useState(false);

    useEffect(() => {
        loadExceptions();
    }, []);

    const loadExceptions = async () => {
        const data = await getAvailabilityExceptions(employeeId);
        setExceptions(data);
    };

    // Helper to update specific slot
    const updateSlot = (index: number, changes: Partial<AvailabilitySlot>) => {
        const newSchedule = [...schedule];
        newSchedule[index] = { ...newSchedule[index], ...changes };
        setSchedule(newSchedule);
    };

    const addSlot = (dayIndex: number) => {
        const newSchedule = [...schedule];
        // Find insert position (after last slot of this day)
        const lastSlotIndex = newSchedule.findLastIndex(s => s.day_of_week === dayIndex);

        const newSlot: AvailabilitySlot = {
            day_of_week: dayIndex,
            start_time: '13:00',
            end_time: '17:00',
            is_available: true,
            is_recurring: true
        };

        if (lastSlotIndex !== -1) {
            newSchedule.splice(lastSlotIndex + 1, 0, newSlot);
        } else {
            newSchedule.push(newSlot);
        }
        setSchedule(newSchedule);
    };

    const removeSlot = (index: number) => {
        const newSchedule = [...schedule];
        const slotToRemove = newSchedule[index];
        const daySlotsCount = newSchedule.filter(s => s.day_of_week === slotToRemove.day_of_week).length;

        if (daySlotsCount > 1) {
            newSchedule.splice(index, 1);
        } else {
            // If it's the last slot, just mark as unavailable
            newSchedule[index].is_available = false;
        }
        setSchedule(newSchedule);
    };

    const toggleDayAvailability = (dayIndex: number, isAvailable: boolean) => {
        // Find all slots for this day
        const indexes = schedule.map((s, i) => s.day_of_week === dayIndex ? i : -1).filter(i => i !== -1);

        const newSchedule = [...schedule];

        if (isAvailable) {
            // Enable all found slots? Or just the first one?
            // User usually wants to turn ON the day.
            // If we have multiple slots, enable them all.
            indexes.forEach(idx => {
                newSchedule[idx].is_available = true;
            });
        } else {
            // Disable all slots for this day
            indexes.forEach(idx => {
                newSchedule[idx].is_available = false;
            });
        }
        setSchedule(newSchedule);
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage('');
        const res = await updateWeeklyAvailability(employeeId, schedule);
        setLoading(false);
        if (res.success) {
            setMessage('Rozvrh úspešne uložený ✅');
            setTimeout(() => setMessage(''), 3000);
        } else {
            alert('Chyba pri ukladaní');
        }
    };

    const handleAddException = async () => {
        if (!newExceptionDate) return;
        setIsAddingException(true);

        const res = await addAvailabilityException(
            employeeId,
            newExceptionDate,
            isExceptionAvailable,
            isExceptionAvailable ? exceptionStart : undefined,
            isExceptionAvailable ? exceptionEnd : undefined
        );

        if (res.success) {
            await loadExceptions();
            setNewExceptionDate('');
            // Reset to defaults
            setIsExceptionAvailable(false);
        } else {
            alert('Chyba pri pridávaní výnimky');
        }
        setIsAddingException(false);
    };

    const handleRemoveException = async (id: string) => {
        if (!confirm('Odstrániť túto výnimku?')) return;
        await removeAvailabilityException(id);
        await loadExceptions();
    };

    return (
        <div style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Týždenná dostupnosť</h2>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="button"
                    style={{
                        backgroundColor: '#5E715D',
                        color: 'white',
                        padding: '0.8rem 1.5rem',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Ukladám...' : (
                        <>
                            <Check size={18} /> Uložiť rozvrh
                        </>
                    )}
                </button>
            </div>

            {message && <div style={{ marginBottom: '1rem', color: 'green', fontWeight: 'bold' }}>{message}</div>}

            <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden' }}>
                {DAYS.map((dayName, dayIndex) => {
                    // Get all slots for this day from schedule state
                    // We need their indices in the main schedule array to update them
                    const daySlotIndices = schedule
                        .map((slot, idx) => (slot.day_of_week === dayIndex ? idx : -1))
                        .filter(idx => idx !== -1);

                    const isDayAvailable = daySlotIndices.some(idx => schedule[idx].is_available);

                    return (
                        <div key={dayIndex} style={{
                            padding: '1rem 1.5rem',
                            borderBottom: dayIndex === 6 ? 'none' : '1px solid #f0f0f0',
                            backgroundColor: isDayAvailable ? 'white' : '#FAFAFA'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                {/* Day Label & Toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '150px', paddingTop: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={isDayAvailable}
                                        onChange={(e) => toggleDayAvailability(dayIndex, e.target.checked)}
                                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontWeight: '500', color: isDayAvailable ? '#333' : '#999' }}>
                                        {dayName}
                                    </span>
                                </div>

                                {/* Slots List */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {isDayAvailable ? (
                                        <>
                                            {daySlotIndices.map((scheduleIdx, localIdx) => {
                                                const slot = schedule[scheduleIdx];
                                                return (
                                                    <div key={`${dayIndex}-${localIdx}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <Clock size={16} color="#666" />
                                                            <input
                                                                type="time"
                                                                value={slot.start_time || '09:00'}
                                                                onChange={(e) => updateSlot(scheduleIdx, { start_time: e.target.value })}
                                                                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ddd' }}
                                                            />
                                                            <span>-</span>
                                                            <input
                                                                type="time"
                                                                value={slot.end_time || '17:00'}
                                                                onChange={(e) => updateSlot(scheduleIdx, { end_time: e.target.value })}
                                                                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ddd' }}
                                                            />
                                                        </div>

                                                        {/* Remove Slot Button */}
                                                        <button
                                                            onClick={() => removeSlot(scheduleIdx)}
                                                            title="Odstrániť časové okno"
                                                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            {/* Add Slot Button */}
                                            <button
                                                onClick={() => addSlot(dayIndex)}
                                                style={{
                                                    alignSelf: 'flex-start',
                                                    marginTop: '0.5rem',
                                                    border: '1px dashed #ccc',
                                                    background: 'none',
                                                    borderRadius: '4px',
                                                    padding: '0.4rem 0.8rem',
                                                    fontSize: '0.8rem',
                                                    color: '#666',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem'
                                                }}
                                            >
                                                <Plus size={14} /> Pridať pauzu / interval
                                            </button>
                                        </>
                                    ) : (
                                        <span style={{ color: '#ccc', fontStyle: 'italic', padding: '0.5rem 0' }}>Voľno</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p style={{ marginTop: '1rem', color: '#888', fontSize: '0.9rem' }}>
                * Tu nastavujete pravidelný týždenný rozvrh. Použite "Pridať interval" pre vytvorenie prestávky (napr. 09:00-12:00 a 13:00-17:00).
            </p>

            <div style={{ marginTop: '3rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>Výnimky (Dovolenky / Zmena času)</h3>
                <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>

                    {/* Add Exception Form */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #f0f0f0' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Dátum</label>
                            <input
                                type="date"
                                value={newExceptionDate}
                                onChange={(e) => setNewExceptionDate(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: '6px' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Stav</label>
                            <select
                                value={isExceptionAvailable ? 'available' : 'unavailable'}
                                onChange={(e) => setIsExceptionAvailable(e.target.value === 'available')}
                                style={{ width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: '6px' }}
                            >
                                <option value="unavailable">Voľno / Dovolenka</option>
                                <option value="available">Dostupný (Iný čas)</option>
                            </select>
                        </div>

                        {isExceptionAvailable && (
                            <>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Od</label>
                                    <input
                                        type="time"
                                        value={exceptionStart}
                                        onChange={(e) => setExceptionStart(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: '6px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Do</label>
                                    <input
                                        type="time"
                                        value={exceptionEnd}
                                        onChange={(e) => setExceptionEnd(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: '6px' }}
                                    />
                                </div>
                            </>
                        )}

                        <button
                            onClick={handleAddException}
                            disabled={!newExceptionDate || isAddingException}
                            className="button"
                            style={{
                                backgroundColor: '#5E715D',
                                color: 'white',
                                padding: '0.6rem 1rem',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                height: '40px',
                                fontWeight: 500
                            }}
                        >
                            {isAddingException ? '...' : 'Pridať'}
                        </button>
                    </div>

                    {/* Exceptions List */}
                    {exceptions.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#999', fontStyle: 'italic', margin: '2rem 0' }}>Žiadne nadchádzajúce výnimky.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {exceptions.map(exc => (
                                <div key={exc.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    backgroundColor: exc.is_available ? '#f0fdf4' : '#fef2f2',
                                    border: `1px solid ${exc.is_available ? '#bbf7d0' : '#fecaca'}`,
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#333' }}>
                                            <Calendar size={16} />
                                            {format(new Date(exc.exception_date), 'd. MMMM yyyy', { locale: sk })}
                                        </div>
                                        <span style={{
                                            fontSize: '0.85rem',
                                            padding: '2px 8px',
                                            borderRadius: '99px',
                                            backgroundColor: exc.is_available ? '#dcfce7' : '#fee2e2',
                                            color: exc.is_available ? '#166534' : '#991b1b',
                                            fontWeight: 500
                                        }}>
                                            {exc.is_available
                                                ? `Dostupný: ${exc.start_time?.slice(0, 5)} - ${exc.end_time?.slice(0, 5)}`
                                                : 'Voľno'}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => handleRemoveException(exc.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            padding: '4px'
                                        }}
                                        title="Odstrániť"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
