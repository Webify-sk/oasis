'use client';

import { useState } from 'react';
import { toggleSessionIndividual } from '@/app/admin/trainings/schedule-actions'; // Correct absolute path? No, path relative to src/
import { Button } from '@/components/ui/Button';
import { Lock, Unlock, Users, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Helper to generate sessions is tricky because it duplicates logic from dashboard. 
// Ideally we'd have a shared utility.
// For now, I'll implement a simple generator here matching the one in Dashboard logic.

interface SessionManagerProps {
    training: any;
    exceptions: any[];
}

export function SessionManager({ training, exceptions }: SessionManagerProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();

    // Generate sessions for next 4 weeks
    const generateUpcomingSessions = () => {
        const sessions: any[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const schedule = training.schedule || [];

        // Loop 28 days
        for (let i = 0; i < 28; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dayName = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'][d.getDay()];

            schedule.forEach((term: any) => {
                if (!term.active) return;

                let matches = false;
                if (term.isRecurring !== false) {
                    if (term.day === dayName) matches = true;
                } else if (term.date) {
                    const termDate = new Date(term.date);
                    if (termDate.toDateString() === d.toDateString()) matches = true;
                }

                if (matches) {
                    // Parse Time
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
        }

        return sessions.sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());
    };

    const upcomingSessions = generateUpcomingSessions();

    const handleToggle = async (session: any, isIndividual: boolean) => {
        setLoading(session.startISO);
        try {
            await toggleSessionIndividual(training.id, session.startISO, isIndividual);
            router.refresh();
        } catch (error) {
            console.error('Failed to toggle session:', error);
            alert('Nastala chyba pri ukladaní.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div style={{ marginTop: '3rem', borderTop: '1px solid #E5E0DD', paddingTop: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'serif', color: '#4A403A', marginBottom: '1.5rem' }}>
                Správa termínov (Individuálne tréningy)
            </h3>

            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {upcomingSessions.map((session, idx) => {
                    // Check exception
                    const exception = exceptions.find(e =>
                        e.training_type_id === training.id &&
                        new Date(e.session_start_time).toISOString() === session.startISO
                    );

                    const isIndividual = exception?.is_individual || false;
                    const isProcessing = loading === session.startISO;

                    return (
                        <div key={idx} style={{
                            padding: '1rem',
                            border: isIndividual ? '1px solid #F59E0B' : '1px solid #E5E0DD',
                            backgroundColor: isIndividual ? '#FFFBEB' : '#fff',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, color: '#4A403A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={16} />
                                    {session.date.toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'long' })}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                                    {session.time}
                                </div>
                                {isIndividual && (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.75rem',
                                        color: '#B45309',
                                        backgroundColor: '#FEF3C7',
                                        padding: '0.1rem 0.5rem',
                                        borderRadius: '4px',
                                        marginTop: '0.5rem'
                                    }}>
                                        <Lock size={12} />
                                        Individuálny
                                    </div>
                                )}
                            </div>

                            <Button
                                variant={isIndividual ? "secondary" : "ghost"}
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => handleToggle(session, !isIndividual)}
                                style={{
                                    borderColor: isIndividual ? '#F59E0B' : undefined,
                                    color: isIndividual ? '#B45309' : '#666'
                                }}
                            >
                                {isProcessing ? '...' : isIndividual ? <Unlock size={18} /> : <Lock size={18} />}
                            </Button>
                        </div>
                    );
                })}
            </div>
            {upcomingSessions.length === 0 && (
                <p style={{ color: '#666', fontStyle: 'italic' }}>Žiadne nadchádzajúce termíny na najbližších 28 dní.</p>
            )}
        </div>
    );
}
