'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, CalendarX } from 'lucide-react';
import { Calendar } from '@/components/ui/Calendar';
import { getPublicSlots, getPublicAvailableDays, type PublicServiceInfo } from '@/actions/public-cosmetics';

interface Props {
    service: PublicServiceInfo;
    baseUrl: string;
}

const BRAND = '#93745F';

function todayStr() {
    // The visitor's own day — the calendar is rendered in their browser.
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
}

function formatDayLabel(date: string) {
    const d = new Date(`${date}T12:00:00`);
    const label = d.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

export function PublicCosmeticsCalendar({ service, baseUrl }: Props) {
    const [selectedDate, setSelectedDate] = useState<string>(todayStr());
    const [slots, setSlots] = useState<string[]>([]);
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    // Tell the embedding page how tall we are, so the iframe can grow with the
    // content instead of showing a scrollbar inside a scrollbar on mobile.
    useEffect(() => {
        const el = containerRef.current;
        if (!el || window.parent === window) return;

        // Measure our own content, not the document: once the iframe has been grown the
        // document can never report a smaller height again, so the frame would never
        // shrink back when the visitor picks a quieter day. The container is a
        // flow-root, so a bottom margin on its last child counts towards its height.
        const report = () => {
            const rect = el.getBoundingClientRect();
            const height = Math.ceil(rect.bottom + window.scrollY + 12);
            window.parent.postMessage({ type: 'oasis-embed-height', height }, '*');
        };

        report();
        const observer = new ResizeObserver(report);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoadingSlots(true);
        getPublicSlots(service.id, selectedDate)
            .then(data => { if (!cancelled) setSlots(data); })
            .catch(() => { if (!cancelled) setSlots([]); })
            .finally(() => { if (!cancelled) setLoadingSlots(false); });
        return () => { cancelled = true; };
    }, [service.id, selectedDate]);

    const handleMonthChange = useCallback((year: number, month: number) => {
        getPublicAvailableDays(service.id, year, month)
            .then(setAvailableDates)
            .catch(() => setAvailableDates([]));
    }, [service.id]);

    // Availability is computed in 10-minute steps and merged across every member of
    // staff, so a busy day yields a long list — split it so it stays scannable.
    const groups = [
        { label: 'Doobeda', times: slots.filter(t => Number(t.split(':')[0]) < 12) },
        { label: 'Poobede', times: slots.filter(t => Number(t.split(':')[0]) >= 12) }
    ].filter(g => g.times.length > 0);

    const bookingUrl = (time: string) =>
        `${baseUrl}/dashboard/cosmetics?serviceId=${encodeURIComponent(service.id)}` +
        `&date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(time)}`;

    return (
        <div ref={containerRef} style={{ fontFamily: 'inherit', color: '#333', display: 'flow-root' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.3rem 0', color: BRAND, fontWeight: 600 }}>
                    {service.title}
                </h2>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={14} /> {service.duration_minutes} min
                </p>
            </div>

            {/* Side by side when there is room; flex-wrap stacks them on a phone. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
                <div style={{ flex: '0 1 350px', minWidth: '280px', margin: '0 auto' }}>
                    <Calendar
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        minDate={todayStr()}
                        availableDates={availableDates}
                        onMonthChange={handleMonthChange}
                    />
                </div>

                <div style={{ flex: '1 1 300px', minWidth: '280px' }}>
                    <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem 0', textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                        {formatDayLabel(selectedDate)}
                    </h3>

                    {loadingSlots ? (
                        <p style={{ textAlign: 'center', color: '#9ca3af', margin: 0 }}>Načítavam voľné termíny…</p>
                    ) : slots.length === 0 ? (
                        <div style={{
                            textAlign: 'center', color: '#6b7280', padding: '1.25rem',
                            backgroundColor: '#f9fafb', borderRadius: '10px', border: '1px solid #f0f0f0'
                        }}>
                            <CalendarX size={22} style={{ color: '#d1d5db', marginBottom: '0.4rem' }} />
                            <p style={{ margin: 0, fontSize: '0.92rem' }}>
                                V tento deň už nie sú voľné termíny. Skúste prosím iný deň —
                                dni s voľnými termínmi sú v kalendári označené zelenou bodkou.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#6b7280', margin: '0 0 0.9rem 0' }}>
                                Kliknutím na čas prejdete k rezervácii.
                            </p>
                            {groups.map(group => (
                                <div key={group.label} style={{ marginBottom: '1.1rem' }}>
                                    <h4 style={{
                                        margin: '0 0 0.55rem 0', fontSize: '0.75rem', fontWeight: 700,
                                        letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9ca3af'
                                    }}>
                                        {group.label}
                                    </h4>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                                        gap: '0.45rem'
                                    }}>
                                        {group.times.map(time => (
                                            <a
                                                key={time}
                                                href={bookingUrl(time)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={`Objednať sa na ${time}`}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    padding: '0.5rem 0.3rem',
                                                    borderRadius: '8px', border: '1px solid #e5e7eb',
                                                    backgroundColor: 'white', color: '#111827',
                                                    textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.borderColor = BRAND;
                                                    e.currentTarget.style.backgroundColor = BRAND;
                                                    e.currentTarget.style.color = 'white';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                                    e.currentTarget.style.backgroundColor = 'white';
                                                    e.currentTarget.style.color = '#111827';
                                                }}
                                            >
                                                {time}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
