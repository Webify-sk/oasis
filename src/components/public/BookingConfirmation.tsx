'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getPublicSlots, type PublicServiceInfo } from '@/actions/public-cosmetics';
import { createAppointmentAnyEmployee } from '@/actions/cosmetic-actions';
import { getRealUtcDate } from '@/utils/booking-logic';
import { formatDateSk } from '@/utils/format-date';

interface Props {
    service: PublicServiceInfo;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
}

const BRAND = '#93745F';
const GREEN = '#5E715D';

/**
 * Final step for a visitor who arrived from the public calendar: everything is already
 * chosen, so all that is left is a note and one button. No wizard, no re-picking.
 */
export function BookingConfirmation({ service, date, time }: Props) {
    const [checking, setChecking] = useState(true);
    const [stillFree, setStillFree] = useState(true);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<{ employeeName?: string } | null>(null);

    const wizardUrl = `/dashboard/cosmetics?serviceId=${encodeURIComponent(service.id)}`;
    const changeLabel = service.staff_count > 1 ? 'Vybrať iný termín alebo terapeutku' : 'Vybrať iný termín';

    // The visitor may have had the calendar open for a while — confirm the slot is still free
    // before showing a button that would only fail.
    useEffect(() => {
        let cancelled = false;
        getPublicSlots(service.id, date)
            .then(slots => { if (!cancelled) setStillFree(slots.includes(time)); })
            .catch(() => { if (!cancelled) setStillFree(true); }) // let the server decide on confirm
            .finally(() => { if (!cancelled) setChecking(false); });
        return () => { cancelled = true; };
    }, [service.id, date, time]);

    const confirm = async () => {
        setSubmitting(true);
        setError(null);
        const start = getRealUtcDate(`${date}T${time}:00`);
        const end = new Date(start.getTime() + service.duration_minutes * 60000);

        const result = await createAppointmentAnyEmployee({
            employee_id: 'any',
            service_id: service.id,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            notes: notes || undefined
        });

        setSubmitting(false);
        if ('error' in result && result.error) {
            setError(result.error);
            return;
        }
        setDone({ employeeName: (result as any).assignedEmployee?.name });
    };

    if (done) {
        return (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{
                    width: 72, height: 72, borderRadius: '50%', backgroundColor: '#e6f4ea', color: '#1e7e34',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto'
                }}>
                    <CheckCircle size={40} />
                </div>
                <h2 style={{ margin: '0 0 0.75rem 0', color: '#111827' }}>Termín je rezervovaný</h2>
                <p style={{ color: '#4b5563', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
                    {service.title}<br />
                    <strong>{formatDateSk(date)} o {time}</strong>
                    {done.employeeName && <><br />Terapeutka: {done.employeeName}</>}
                    <br />Potvrdenie sme vám poslali e-mailom.
                </p>
                <Link href="/dashboard/cosmetics/appointments" style={{ color: BRAND, fontWeight: 600 }}>
                    Moje rezervácie
                </Link>
            </div>
        );
    }

    return (
        <div>
            {checking ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', margin: '1rem 0' }}>
                    <Loader2 size={16} className="animate-spin" style={{ verticalAlign: '-3px', marginRight: 6 }} />
                    Overujem, či je termín stále voľný…
                </p>
            ) : !stillFree ? (
                <div style={{
                    backgroundColor: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa',
                    borderRadius: '10px', padding: '1rem', textAlign: 'center', marginBottom: '1rem'
                }}>
                    <AlertCircle size={20} style={{ marginBottom: 6 }} />
                    <p style={{ margin: '0 0 0.75rem 0' }}>
                        Tento termín je medzičasom obsadený. Vyberte si prosím iný.
                    </p>
                    <Link href={wizardUrl} style={{ color: '#9a3412', fontWeight: 600 }}>{changeLabel}</Link>
                </div>
            ) : (
                <>
                    {error && (
                        <div style={{
                            backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca',
                            borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1rem', fontSize: '0.92rem'
                        }}>
                            {error}
                            <div style={{ marginTop: '0.5rem' }}>
                                <Link href={wizardUrl} style={{ color: '#b91c1c', fontWeight: 600 }}>{changeLabel}</Link>
                            </div>
                        </div>
                    )}

                    <p style={{ fontSize: '0.88rem', color: '#6b7280', margin: '0 0 1rem 0', textAlign: 'center' }}>
                        {service.staff_count > 1
                            ? 'Terapeutku vám priradíme podľa dostupnosti.'
                            : 'Termín potvrdíte jedným kliknutím.'}
                    </p>

                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.92rem' }}>
                        Poznámka (voliteľné)
                    </label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Máte špecifickú požiadavku? Napíšte nám…"
                        maxLength={500}
                        style={{
                            width: '100%', boxSizing: 'border-box', padding: '0.8rem', borderRadius: '8px',
                            border: '1px solid #ddd', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical',
                            marginBottom: '1rem'
                        }}
                    />

                    <button
                        type="button"
                        onClick={confirm}
                        disabled={submitting}
                        style={{
                            width: '100%', backgroundColor: GREEN, color: 'white', padding: '0.95rem',
                            border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem',
                            cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1
                        }}
                    >
                        {submitting ? 'Rezervujem…' : 'Potvrdiť rezerváciu'}
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '1rem', marginBottom: 0, fontSize: '0.88rem' }}>
                        <Link href={wizardUrl} style={{ color: '#6b7280' }}>{changeLabel}</Link>
                    </p>
                </>
            )}
        </div>
    );
}

