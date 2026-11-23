'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { addTrainerVacationFromForm, type VacationFormState } from '@/actions/trainer-vacations';

const input: React.CSSProperties = { width: '100%', padding: '0.6rem', border: '1px solid #D1D5DB', borderRadius: '6px', boxSizing: 'border-box' };
const label: React.CSSProperties = { display: 'block', fontSize: '0.85rem', color: '#4B5563', marginBottom: '0.25rem' };

export function TrainerVacationForm({ trainerId }: { trainerId: string }) {
    const [state, action, pending] = useActionState<VacationFormState, FormData>(
        addTrainerVacationFromForm.bind(null, trainerId),
        {}
    );
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state.ok) formRef.current?.reset();
    }, [state.at, state.ok]);

    return (
        <form ref={formRef} action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                    <label style={label}>Od (Dátum)</label>
                    <input type="date" name="startDate" required style={input} />
                </div>
                <div>
                    <label style={label}>Čas Od</label>
                    <input type="time" name="startTime" defaultValue="08:00" required style={input} />
                </div>
                <div>
                    <label style={label}>Do (Dátum)</label>
                    <input type="date" name="endDate" required style={input} />
                </div>
                <div>
                    <label style={label}>Čas Do</label>
                    <input type="time" name="endTime" defaultValue="20:00" required style={input} />
                </div>
            </div>

            <div>
                <label style={label}>Poznámka (nepovinné)</label>
                <input type="text" name="description" maxLength={200} placeholder="Napr. Choroba, Dovolenka..." style={input} />
            </div>

            {state.error && (
                <p role="alert" style={{ margin: 0, padding: '0.7rem 0.9rem', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <AlertCircle size={16} /> {state.error}
                </p>
            )}
            {state.ok && (
                <p role="status" style={{ margin: 0, padding: '0.7rem 0.9rem', borderRadius: '6px', backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <CheckCircle size={16} /> Voľno bolo pridané.
                </p>
            )}

            <button type="submit" disabled={pending} style={{ backgroundColor: '#5E715D', color: 'white', padding: '0.7rem 1.5rem', border: 'none', borderRadius: '6px', cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.7 : 1, fontWeight: 600, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} /> {pending ? 'Ukladám…' : 'Pridať voľno'}
            </button>
        </form>
    );
}
