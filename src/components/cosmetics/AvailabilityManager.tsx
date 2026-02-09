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

        // Conflict Check (Only if setting unavailable)
        if (!isExceptionAvailable) {
            const { checkConflictingAppointments } = await import('@/actions/cosmetic-actions');
            const conflicts = await checkConflictingAppointments(
                employeeId,
                newExceptionDate,
                undefined, // Assuming full day off for now in UI flow simplicity or user needs to specify?
                // The UI has start/end inputs but they are hidden if !isExceptionAvailable (== 'unavailable').
                // Wait, if isExceptionAvailable is false (Vacation), startTime/endTime are undefined in current logic?
                // Looking at JSX:
                // <option value="unavailable">🏖️ Voľno / Dovolenka</option>
                // <option value="available">✅ Dostupný (Iný čas)</option>
                // Input fields: {isExceptionAvailable && ( ...inputs... )}
                // So if unavailable/vacation, it's a FULL DAY off (or at least valid availability is removed).
                // My checkConflictingAppointments logic handles undefined start/end as full day check.
                // So this logic holds.
                undefined
            );

            if (conflicts && conflicts.count > 0) {
                const confirmed = window.confirm(`Pozor! Na tento deň máte naplánované ${conflicts.count} rezervácie. Naozaj chcete nastaviť voľno? (Rezervácie nebudú zrušené automaticky)`);
                if (!confirmed) return;
            }
        }

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
            setMessage('Výnimka pridaná ✅');
            setTimeout(() => setMessage(''), 3000);
        } else {
            alert('Chyba pri pridávaní výnimky');
        }
        setIsAddingException(false);
    };

    // Modal State
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

    const initiateRemoveException = (id: string) => {
        setConfirmModal({ isOpen: true, id });
    };

    const confirmRemoveException = async () => {
        if (!confirmModal.id) return;
        await removeAvailabilityException(confirmModal.id);
        await loadExceptions();
        setConfirmModal({ isOpen: false, id: null });
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: 'var(--font-sans, sans-serif)' }}>

            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #eee'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontFamily: 'Georgia, serif', color: '#2c3e50', margin: 0 }}>
                        Moja dostupnosť
                    </h2>
                    <p style={{ color: '#888', margin: '0.5rem 0 0 0' }}>
                        Nastavte si pravidelný týždenný rozvrh a výnimky.
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    style={{
                        backgroundColor: '#5E715D',
                        color: 'white',
                        padding: '0.8rem 1.5rem',
                        border: 'none',
                        borderRadius: '30px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(94, 113, 93, 0.3)',
                        opacity: loading ? 0.8 : 1,
                        transition: 'transform 0.2s'
                    }}
                >
                    {loading ? (
                        <>Ukladám...</>
                    ) : (
                        <><Check size={18} /> Uložiť zmeny</>
                    )}
                </button>
            </div>

            {message && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#f0fdf4',
                    color: '#166534',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                    <Check size={18} /> {message}
                </div>
            )}

            {/* Weekly Schedule Card */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                border: '1px solid #f0f0f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                overflow: 'hidden',
                marginBottom: '3rem'
            }}>
                <div style={{ padding: '1.5rem', backgroundColor: '#fafafa', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, color: '#444', fontSize: '1.1rem' }}>Týždenný rozvrh</h3>
                </div>

                <div>
                    {DAYS.map((dayName, dayIndex) => {
                        const daySlotIndices = schedule
                            .map((slot, idx) => (slot.day_of_week === dayIndex ? idx : -1))
                            .filter(idx => idx !== -1);

                        const isDayAvailable = daySlotIndices.some(idx => schedule[idx].is_available);

                        return (
                            <div key={dayIndex} style={{
                                padding: '1.2rem 1.5rem',
                                borderBottom: dayIndex === 6 ? 'none' : '1px solid #f5f5f5',
                                backgroundColor: isDayAvailable ? 'white' : '#fcfcfc',
                                transition: 'background-color 0.2s'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2rem' }}>

                                    {/* Left: Day Label & Switch */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        minWidth: '160px', paddingTop: '0.5rem'
                                    }}>
                                        <div
                                            onClick={() => toggleDayAvailability(dayIndex, !isDayAvailable)}
                                            style={{
                                                width: '44px', height: '24px',
                                                backgroundColor: isDayAvailable ? '#5E715D' : '#e5e7eb',
                                                borderRadius: '99px',
                                                position: 'relative',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <div style={{
                                                width: '18px', height: '18px',
                                                backgroundColor: 'white',
                                                borderRadius: '50%',
                                                position: 'absolute',
                                                top: '3px',
                                                left: isDayAvailable ? '23px' : '3px',
                                                transition: 'left 0.2s',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                            }} />
                                        </div>
                                        <span style={{
                                            fontWeight: 600,
                                            color: isDayAvailable ? '#2c3e50' : '#a0aec0',
                                            fontSize: '1rem'
                                        }}>
                                            {dayName}
                                        </span>
                                    </div>

                                    {/* Right: Time Slots */}
                                    <div style={{ flex: 1 }}>
                                        {isDayAvailable ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                {daySlotIndices.map((scheduleIdx, localIdx) => {
                                                    const slot = schedule[scheduleIdx];
                                                    return (
                                                        <div key={`${dayIndex}-${localIdx}`} style={{
                                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                                            animation: 'fadeIn 0.2s ease-out'
                                                        }}>
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.8rem',
                                                                backgroundColor: '#f8f9fa', padding: '0.4rem 0.8rem',
                                                                borderRadius: '8px', border: '1px solid #eee'
                                                            }}>
                                                                <Clock size={15} color="#888" />
                                                                <input
                                                                    type="time"
                                                                    value={slot.start_time || '09:00'}
                                                                    onChange={(e) => updateSlot(scheduleIdx, { start_time: e.target.value })}
                                                                    style={{
                                                                        padding: '0.2rem',
                                                                        borderRadius: '4px',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        fontWeight: 500,
                                                                        color: '#333'
                                                                    }}
                                                                />
                                                                <span style={{ color: '#ccc' }}>—</span>
                                                                <input
                                                                    type="time"
                                                                    value={slot.end_time || '17:00'}
                                                                    onChange={(e) => updateSlot(scheduleIdx, { end_time: e.target.value })}
                                                                    style={{
                                                                        padding: '0.2rem',
                                                                        borderRadius: '4px',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        fontWeight: 500,
                                                                        color: '#333'
                                                                    }}
                                                                />
                                                            </div>

                                                            <button
                                                                onClick={() => removeSlot(scheduleIdx)}
                                                                title="Odstrániť časové okno"
                                                                style={{
                                                                    border: 'none', background: '#fee2e2', color: '#ef4444',
                                                                    cursor: 'pointer', padding: '6px', borderRadius: '50%',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                }}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}

                                                <button
                                                    onClick={() => addSlot(dayIndex)}
                                                    style={{
                                                        alignSelf: 'flex-start',
                                                        marginTop: '0.2rem',
                                                        background: 'none',
                                                        border: '1px dashed #cbd5e0',
                                                        borderRadius: '6px',
                                                        padding: '0.5rem 1rem',
                                                        fontSize: '0.85rem',
                                                        color: '#718096',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#5E715D'; e.currentTarget.style.color = '#5E715D'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e0'; e.currentTarget.style.color = '#718096'; }}
                                                >
                                                    <Plus size={14} /> Pridať interval
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ padding: '0.5rem 0', color: '#a0aec0', fontStyle: 'italic', fontSize: '0.95rem' }}>
                                                Zatvorené
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Exceptions Section Card */}
            <div style={{ marginTop: '3rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'Georgia, serif', color: '#2c3e50', marginBottom: '1.5rem' }}>
                    Výnimky (Dovolenky / Zmena času)
                </h3>

                <div style={{
                    backgroundColor: 'white', borderRadius: '16px', padding: '2rem',
                    border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                }}>

                    {/* Add Form */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '1.5rem', alignItems: 'end', marginBottom: '2.5rem',
                        paddingBottom: '2rem', borderBottom: '1px solid #f0f0f0'
                    }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568' }}>Dátum</label>
                            <input
                                type="date"
                                value={newExceptionDate}
                                onChange={(e) => setNewExceptionDate(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.7rem', border: '1px solid #e2e8f0',
                                    borderRadius: '8px', fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568' }}>Dostupnosť</label>
                            <select
                                value={isExceptionAvailable ? 'available' : 'unavailable'}
                                onChange={(e) => setIsExceptionAvailable(e.target.value === 'available')}
                                style={{
                                    width: '100%', padding: '0.7rem', border: '1px solid #e2e8f0',
                                    borderRadius: '8px', fontSize: '0.95rem', backgroundColor: 'white'
                                }}
                            >
                                <option value="unavailable">🏖️ Voľno / Dovolenka</option>
                                <option value="available">✅ Dostupný (Iný čas)</option>
                            </select>
                        </div>

                        {isExceptionAvailable && (
                            <>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568' }}>Od</label>
                                    <input
                                        type="time"
                                        value={exceptionStart}
                                        onChange={(e) => setExceptionStart(e.target.value)}
                                        style={{
                                            width: '100%', padding: '0.7rem', border: '1px solid #e2e8f0',
                                            borderRadius: '8px', fontSize: '0.95rem'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568' }}>Do</label>
                                    <input
                                        type="time"
                                        value={exceptionEnd}
                                        onChange={(e) => setExceptionEnd(e.target.value)}
                                        style={{
                                            width: '100%', padding: '0.7rem', border: '1px solid #e2e8f0',
                                            borderRadius: '8px', fontSize: '0.95rem'
                                        }}
                                    />
                                </div>
                            </>
                        )}

                        <button
                            onClick={handleAddException}
                            disabled={!newExceptionDate || isAddingException}
                            style={{
                                backgroundColor: isAddingException ? '#cbd5e0' : '#5E715D',
                                color: 'white',
                                padding: '0.7rem 1.5rem',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isAddingException ? 'not-allowed' : 'pointer',
                                height: '44px',
                                fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                transition: 'background-color 0.2s',
                                width: '100%'
                            }}
                        >
                            {isAddingException ? '...' : <><Plus size={18} /> Pridať</>}
                        </button>
                    </div>

                    {/* Exceptions Grid */}
                    {exceptions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                            <Calendar size={40} color="#cbd5e0" style={{ marginBottom: '1rem' }} />
                            <p style={{ color: '#718096', margin: 0 }}>Zatiaľ nemáte pridané žiadne výnimky.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {exceptions.map(exc => (
                                <div key={exc.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1.2rem',
                                    backgroundColor: 'white',
                                    border: exc.is_available ? '1px solid #bbf7d0' : '1px solid #fecaca',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    {/* Color Strip */}
                                    <div style={{
                                        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                                        backgroundColor: exc.is_available ? '#22c55e' : '#ef4444'
                                    }} />

                                    <div style={{ paddingLeft: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#2c3e50', marginBottom: '0.3rem' }}>
                                            <Calendar size={16} color="#718096" />
                                            {format(new Date(exc.exception_date), 'd. MMMM yyyy', { locale: sk })}
                                        </div>
                                        <div style={{
                                            fontSize: '0.85rem',
                                            color: exc.is_available ? '#166534' : '#991b1b',
                                            display: 'flex', alignItems: 'center', gap: '0.4rem'
                                        }}>
                                            {exc.is_available ? (
                                                <><Clock size={12} /> {exc.start_time?.slice(0, 5)} - {exc.end_time?.slice(0, 5)}</>
                                            ) : (
                                                '🏖️ Voľno'
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => initiateRemoveException(exc.id)}
                                        style={{
                                            background: '#fff1f2',
                                            border: 'none',
                                            color: '#fb7185',
                                            cursor: 'pointer',
                                            padding: '0.5rem',
                                            borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        title="Odstrániť"
                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff1f2'; e.currentTarget.style.color = '#fb7185'; }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(3px)'
                }} onClick={() => setConfirmModal({ isOpen: false, id: null })}>
                    <div style={{
                        backgroundColor: 'white', padding: '2rem', borderRadius: '16px',
                        width: '90%', maxWidth: '380px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                        animation: 'fadeIn 0.2s ease-out'
                    }} onClick={e => e.stopPropagation()}>
                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#1f2937' }}>Odstrániť výnimku?</h4>
                        <p style={{ color: '#4b5563', marginBottom: '2rem', lineHeight: '1.5' }}>
                            Naozaj chcete odstrániť túto výnimku z dostupnosti?
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, id: null })}
                                style={{
                                    padding: '0.7rem 1.2rem', borderRadius: '8px', border: '1px solid #e5e7eb',
                                    background: 'white', color: '#374151', cursor: 'pointer', fontWeight: 500
                                }}
                            >
                                Zrušiť
                            </button>
                            <button
                                onClick={confirmRemoveException}
                                style={{
                                    padding: '0.7rem 1.2rem', borderRadius: '8px', border: 'none',
                                    background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 500
                                }}
                            >
                                Odstrániť
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
