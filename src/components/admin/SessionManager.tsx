'use client';

import { useState, useEffect } from 'react';
import { toggleSessionIndividual } from '@/app/admin/trainings/schedule-actions';
import { Button } from '@/components/ui/Button';
import { Lock, Unlock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Trash2, ChevronDown, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import formStyles from './TrainingForm.module.css';

interface SessionManagerProps {
    training: any;
    exceptions: any[];
    addTerm?: (date?: string) => number;
    updateTerm?: (id: number, field: string, value: any) => void;
    removeTerm?: (id: number) => void;
    trainers?: any[];
}

export function SessionManager({ training, exceptions, addTerm, updateTerm, removeTerm, trainers = [] }: SessionManagerProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [currentMonthDate, setCurrentMonthDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [pendingSelectionId, setPendingSelectionId] = useState<number | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const router = useRouter();

    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Monday start

    const daysInMonth = lastDayOfMonth.getDate();
    const totalSlots = 42;

    const cells: { day: number, type: 'prev' | 'current' | 'next', date: Date }[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const d = prevMonthLastDay - i;
        cells.push({ day: d, type: 'prev', date: new Date(year, month - 1, d) });
    }

    for (let i = 1; i <= daysInMonth; i++) {
        cells.push({ day: i, type: 'current', date: new Date(year, month, i) });
    }

    const remaining = totalSlots - cells.length;
    for (let i = 1; i <= remaining; i++) {
        cells.push({ day: i, type: 'next', date: new Date(year, month + 1, i) });
    }

    // Generate sessions for the visible dates
    const generateDisplaySessions = () => {
        const sessions: any[] = [];
        const schedule = training.schedule || [];

        cells.forEach(cell => {
            const d = cell.date;
            const dayName = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'][d.getDay()];

            schedule.forEach((term: any) => {
                if (!term.active) return;

                let matches = false;
                if (term.isRecurring !== false) {
                    if (term.day === dayName) matches = true;
                } else if (term.date) {
                    const [y, m, dNum] = term.date.split('T')[0].split('-');
                    if (d.getFullYear() === Number(y) && d.getMonth() === Number(m) - 1 && d.getDate() === Number(dNum)) {
                        matches = true;
                    }
                }

                if (matches) {
                    let timeStr = term.time;
                    if (timeStr.includes('-')) timeStr = timeStr.split('-')[0].trim();
                    const [hours, minutes] = timeStr.split(':').map(Number);

                    if (!isNaN(hours)) {
                        const startTimestamp = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes, 0, 0);
                        const startISO = new Date(startTimestamp).toISOString();

                        sessions.push({
                            startISO,
                            time: term.time,
                            date: d,
                            termId: term.id
                        });
                    }
                }
            });
        });

        return sessions;
    };

    const displaySessions = generateDisplaySessions();

    useEffect(() => {
        if (pendingSelectionId) {
             const match = displaySessions.find(s => s.termId === pendingSelectionId);
             if (match) {
                 const exception = exceptions.find(e => 
                    e.training_type_id === training.id &&
                    new Date(e.session_start_time).toISOString() === match.startISO
                 );
                 const isIndiv = exception?.is_individual || false;
                 setSelectedSession({ session: match, isIndividual: isIndiv });
                 setPendingSelectionId(null);
             }
        }
    }, [displaySessions, pendingSelectionId, exceptions, training.id]);

    const handleToggle = async (session: any, isIndividual: boolean) => {
        setLoading(session.startISO);
        try {
            await toggleSessionIndividual(training.id, session.startISO, isIndividual);
            setSelectedSession(null);
            router.refresh();
        } catch (error) {
            console.error('Failed to toggle session:', error);
            alert('Nastala chyba pri ukladaní.');
        } finally {
            setLoading(null);
            setSelectedSession(null);
        }
    };

    const handleEmptyCellClick = (d: Date) => {
        if (!addTerm) return;
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const newId = addTerm(dStr);
        if (newId) setPendingSelectionId(newId);
    };

    const handlePrevMonth = () => {
        const d = new Date(currentMonthDate);
        d.setMonth(d.getMonth() - 1);
        setCurrentMonthDate(d);
    };

    const handleNextMonth = () => {
        const d = new Date(currentMonthDate);
        d.setMonth(d.getMonth() + 1);
        setCurrentMonthDate(d);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return dateString.split('T')[0];
    };

    const weekDays = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
    const monthNames = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];

    const selectedTermInfo = selectedSession ? (training.schedule || []).find((t: any) => t.id === selectedSession.session.termId) : null;

    return (
        <div style={{ marginTop: '3rem', borderTop: '1px solid #E5E0DD', paddingTop: '2rem' }}>
            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'center', 
                marginBottom: '1.5rem',
                gap: '1rem'
            }}>
                <h3 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontFamily: 'serif', color: '#4A403A', margin: 0 }}>
                    Kalendár termínov
                </h3>
                <div style={{ 
                    display: 'flex', 
                    gap: '0.75rem',
                    width: isMobile ? '100%' : 'auto'
                }}>
                    {addTerm && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                const newId = addTerm();
                                if (newId) setPendingSelectionId(newId);
                            }} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                flex: isMobile ? 1 : 'none',
                                padding: isMobile ? '0.5rem 0.5rem' : '0.5rem 1rem',
                                fontSize: isMobile ? '0.75rem' : '0.875rem'
                            }}
                        >
                            + Pridať termín
                        </Button>
                    )}
                    <Button 
                        type="submit" 
                        form="training-form"
                        style={{ 
                            backgroundColor: '#8C4848', 
                            color: '#fff', 
                            padding: isMobile ? '0.5rem 0.5rem' : '0.5rem 1.5rem', 
                            fontSize: isMobile ? '0.75rem' : '0.9rem',
                            flex: isMobile ? 1 : 'none'
                        }}
                    >
                        ULOŽIŤ ZMENY
                    </Button>
                </div>
            </div>

            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'stretch' : 'center', 
                marginBottom: '1rem',
                gap: '1rem'
            }}>
                <h4 style={{ fontSize: isMobile ? '1rem' : '1.2rem', color: '#4A403A', fontWeight: 600, textAlign: isMobile ? 'center' : 'left' }}>
                    {monthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: isMobile ? 'center' : 'flex-end' }}>
                    <Button variant="outline" size="sm" onClick={handlePrevMonth} style={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>
                        <ChevronLeft size={isMobile ? 14 : 16} /> Predchádzajúci
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextMonth} style={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>
                        Ďalší <ChevronRight size={isMobile ? 14 : 16} />
                    </Button>
                </div>
            </div>

            {!isMobile && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px' }}>
                    {weekDays.map(d => (
                        <div key={d} style={{ 
                            textAlign: 'center', 
                            fontWeight: 'bold', 
                            padding: '0.5rem 0', 
                            color: '#666', 
                            borderBottom: '2px solid #E5E0DD',
                            fontSize: '0.85rem'
                        }}>
                            {d}
                        </div>
                    ))}
                </div>
            )}
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(7, minmax(0, 1fr))', 
                gap: isMobile ? '12px' : '4px',
                marginTop: isMobile ? '8px' : '0'
            }}>
                {cells.map((cell, idx) => {
                    const isOtherMonth = cell.type !== 'current';
                    
                    // On mobile, hide placeholder days from previous/next months to keep list clean
                    if (isMobile && isOtherMonth) return null;

                    const cellEvents = displaySessions
                        .filter(e => e.date.toDateString() === cell.date.toDateString())
                        .sort((a, b) => a.startISO.localeCompare(b.startISO));
                    
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const isToday = cell.date.getTime() === today.getTime();
                    const isPast = cell.date.getTime() < today.getTime();

                    // Mobile Layout: Agenda Card List
                    if (isMobile) {
                        // On mobile, hide past days completely so users don't have to scroll past them
                        if (isPast) return null;

                        const dayName = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'][cell.date.getDay()];
                        const hasEvents = cellEvents.length > 0;

                        return (
                            <div 
                                key={idx}
                                style={{
                                    backgroundColor: '#FFF',
                                    border: isToday ? '2px solid #93745F' : '1px solid #E5E0DD',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                {/* Mobile Card Header */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    backgroundColor: isToday ? '#FDFBF9' : '#F9F9F9',
                                    borderBottom: hasEvents ? '1px solid #E5E0DD' : 'none'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: isToday ? '#93745F' : '#333' }}>
                                            {cell.day}.
                                        </span>
                                        <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 500 }}>
                                            {dayName}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEmptyCellClick(cell.date);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid #E5E0DD',
                                            borderRadius: '6px',
                                            padding: '4px 8px',
                                            fontSize: '0.75rem',
                                            color: '#666',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            cursor: 'pointer',
                                            fontWeight: 600
                                        }}
                                    >
                                        + Pridať
                                    </button>
                                </div>

                                {/* Mobile Card Events */}
                                {hasEvents && (
                                    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {cellEvents.map((session, sIdx) => {
                                            const exception = exceptions.find(e => 
                                                e.training_type_id === training.id &&
                                                new Date(e.session_start_time).toISOString() === session.startISO
                                            );
                                            const isIndividual = exception?.is_individual || false;
                                            const isProcessing = loading === session.startISO;

                                            return (
                                                <div 
                                                    key={sIdx}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSession({ session, isIndividual });
                                                    }}
                                                    style={{
                                                        padding: '12px 16px',
                                                        backgroundColor: isIndividual ? '#FEF3C7' : '#F4F6F4',
                                                        borderLeft: isIndividual ? '4px solid #F59E0B' : '4px solid #5E715D',
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        cursor: 'pointer',
                                                        opacity: isProcessing ? 0.5 : 1,
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        {isIndividual 
                                                            ? <Lock size={16} color="#B45309" /> 
                                                            : <span style={{display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#5E715D', borderRadius: '50%'}}></span>
                                                        }
                                                        <span style={{ fontSize: '1.05rem', fontWeight: 600, color: isIndividual ? '#B45309' : '#333' }}>
                                                            {session.time}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '0.8rem', color: isIndividual ? '#92400E' : '#666', fontWeight: 500, backgroundColor: isIndividual ? 'rgba(245, 158, 11, 0.15)' : 'rgba(94, 113, 93, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                                                        {isIndividual ? 'Individuálny' : 'Skupinový'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // Desktop Layout: Grid Cell
                    return (
                        <div 
                            key={idx} 
                            onClick={() => {
                                handleEmptyCellClick(cell.date);
                            }}
                            style={{ 
                            minHeight: '100px', 
                            padding: '4px', 
                            backgroundColor: isOtherMonth ? '#F9F9F9' : '#FFF',
                            border: isToday ? '2px solid #93745F' : '1px solid #E5E0DD',
                            borderRadius: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            cursor: 'cell',
                            overflow: 'hidden'
                        }}>
                            <div style={{ 
                                textAlign: 'right', 
                                fontSize: '0.8rem', 
                                color: isOtherMonth ? '#aaa' : (isToday ? '#93745F' : '#333'),
                                fontWeight: isToday ? 'bold' : 'normal',
                                padding: '2px 4px',
                            }}>
                                {cell.day}
                            </div>
                            
                            {cellEvents.map((session, sIdx) => {
                                const exception = exceptions.find(e => 
                                    e.training_type_id === training.id &&
                                    new Date(e.session_start_time).toISOString() === session.startISO
                                );
                                const isIndividual = exception?.is_individual || false;
                                const isProcessing = loading === session.startISO;

                                return (
                                    <div 
                                        key={sIdx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedSession({ session, isIndividual });
                                        }}
                                        style={{
                                            fontSize: '0.75rem',
                                            padding: '4px 6px',
                                            backgroundColor: isIndividual ? '#FEF3C7' : '#F4F6F4',
                                            color: isIndividual ? '#B45309' : '#5E715D',
                                            borderLeft: isIndividual ? '3px solid #F59E0B' : '3px solid #5E715D',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            gap: '4px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            opacity: isProcessing ? 0.5 : 1,
                                            lineHeight: 1,
                                            boxSizing: 'border-box'
                                        }}
                                        title={session.time}
                                    >
                                        {isIndividual ? <Lock size={10} style={{ flexShrink: 0 }} /> : <span style={{display: 'inline-block', width: '3px', height: '3px', backgroundColor: '#5E715D', borderRadius: '50%', flexShrink: 0}}></span>}
                                        {session.time}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {selectedSession && selectedTermInfo && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setSelectedSession(null)}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '500px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontFamily: 'serif', fontSize: '1.25rem', color: '#4A403A', margin: 0 }}>
                                {selectedTermInfo.isRecurring !== false ? 'Úprava opakovacieho pravidla' : 'Detail jednorazového termínu'}
                            </h3>
                            <button onClick={() => setSelectedSession(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {selectedTermInfo.isRecurring !== false && (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span style={{ fontSize: '0.85rem', color: '#92400E' }}>
                                    Upravujete <strong>pravidlo opakovania</strong>. Akékoľvek zmeny (napr. zmena času) ovplyvnia <strong>všetky</strong> tréningy v tento deň v každom týždni!
                                </span>
                            </div>
                        )}
                        
                        {/* Term Editor integrated from TrainingForm */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>Typ termínu</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                checked={selectedTermInfo.isRecurring !== false}
                                                onChange={() => updateTerm && updateTerm(selectedTermInfo.id, 'isRecurring', true)}
                                            />
                                            Opakovaný (týždenne)
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                checked={selectedTermInfo.isRecurring === false}
                                                onChange={() => updateTerm && updateTerm(selectedTermInfo.id, 'isRecurring', false)}
                                            />
                                            Jednorazový (dátum)
                                        </label>
                                    </div>
                                </div>
                                
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Tréner</label>
                                    <div className={formStyles.selectWrapper}>
                                        <select
                                            value={selectedTermInfo.trainer_id}
                                            onChange={(e) => updateTerm && updateTerm(selectedTermInfo.id, 'trainer_id', e.target.value)}
                                            className={`${formStyles.input} ${formStyles.select}`}
                                        >
                                            <option value="">Vyberte trénera</option>
                                            {trainers.map((t: any) => (
                                                <option key={t.id} value={t.id}>{t.full_name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className={formStyles.selectIcon} />
                                    </div>
                                </div>

                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {selectedTermInfo.isRecurring !== false ? (
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Deň v týždni</label>
                                        <div className={formStyles.selectWrapper}>
                                            <select
                                                value={selectedTermInfo.day}
                                                onChange={(e) => updateTerm && updateTerm(selectedTermInfo.id, 'day', e.target.value)}
                                                className={`${formStyles.input} ${formStyles.select}`}
                                            >
                                                <option value="Pondelok">Pondelok</option>
                                                <option value="Utorok">Utorok</option>
                                                <option value="Streda">Streda</option>
                                                <option value="Štvrtok">Štvrtok</option>
                                                <option value="Piatok">Piatok</option>
                                                <option value="Sobota">Sobota</option>
                                                <option value="Nedeľa">Nedeľa</option>
                                            </select>
                                            <ChevronDown size={16} className={formStyles.selectIcon} />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Dátum</label>
                                        <input
                                            type="date"
                                            value={formatDate(selectedTermInfo.date)}
                                            onChange={(e) => updateTerm && updateTerm(selectedTermInfo.id, 'date', e.target.value)}
                                            className={formStyles.input}
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Čas začiatku</label>
                                    <input
                                        type="time"
                                        value={selectedTermInfo.time.replace(/ - .*/, '')}
                                        onChange={(e) => updateTerm && updateTerm(selectedTermInfo.id, 'time', e.target.value)}
                                        className={formStyles.input}
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            
                            <hr style={{ border: 'none', borderTop: '1px solid #E5E0DD', margin: '0.5rem 0' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#4A403A' }}>
                                        Stav termínu: 
                                    </span>
                                    <span style={{
                                        backgroundColor: selectedTermInfo.active ? '#4CAF50' : '#ccc',
                                        color: '#fff',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer'
                                    }} onClick={() => updateTerm && updateTerm(selectedTermInfo.id, 'active', !selectedTermInfo.active)}>
                                        {selectedTermInfo.active ? 'Aktívny' : 'Neaktívny'}
                                    </span>
                                </div>
                                
                                {removeTerm && (
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            removeTerm(selectedTermInfo.id);
                                            setSelectedSession(null);
                                        }} 
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#8C4848', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Trash2 size={18} /> Vymazať
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ margin: '1.5rem 0 1rem 0' }}>
                            <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', color: '#4A403A' }}>Režim tohto konkrétneho termínu ({selectedSession.session.date.toLocaleDateString('sk-SK')})</h4>
                            <div style={{ 
                                padding: '1rem', 
                                backgroundColor: selectedSession.isIndividual ? '#FFFBEB' : '#F9F9F9', 
                                border: selectedSession.isIndividual ? '1px solid #F59E0B' : '1px solid #E5E0DD',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <strong style={{ display: 'block', color: selectedSession.isIndividual ? '#B45309' : '#333' }}>
                                        {selectedSession.isIndividual ? 'Individuálny' : 'Skupinový'}
                                    </strong>
                                    <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                        {selectedSession.isIndividual ? 'Ochránené' : 'Otvorené pre viac ľudí'}
                                    </span>
                                </div>
                                
                                <Button 
                                    variant={selectedSession.isIndividual ? "secondary" : "primary"}
                                    size="sm"
                                    disabled={loading === selectedSession.session.startISO}
                                    onClick={() => handleToggle(selectedSession.session, !selectedSession.isIndividual)}
                                    style={{
                                        borderColor: selectedSession.isIndividual ? '#F59E0B' : undefined,
                                        color: selectedSession.isIndividual ? '#B45309' : undefined
                                    }}
                                >
                                    {loading === selectedSession.session.startISO ? '...' : selectedSession.isIndividual ? <><Unlock size={16} style={{marginRight: '6px'}}/> Odomknúť</> : <><Lock size={16} style={{marginRight: '6px'}}/> Uzamknúť</>}
                                </Button>
                            </div>
                        </div>

                        {/* Remind user they still need to save database wide changes */}
                        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#999' }}>Po dokončení úprav nezabudnite úplne hore formulára stlačiť <strong>ULOŽIŤ ZMENY</strong>!</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
