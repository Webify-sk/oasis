import { Clock, Euro } from 'lucide-react';
import type { PublicServiceInfo } from '@/actions/public-cosmetics';
import { formatDateSk } from '@/utils/format-date';

const BRAND = '#93745F';

/** The chosen service, day and time — shown identically before and after login. */
export function BookingSummary({ service, date, time }: { service: PublicServiceInfo; date: string; time: string }) {
    return (
        <>
            <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700, textAlign: 'center' }}>
                Vaša rezervácia
            </p>
            <h1 style={{ margin: '0 0 0.6rem 0', fontSize: '1.35rem', color: BRAND, textAlign: 'center', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                {service.title}
            </h1>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 700, color: '#111827', textAlign: 'center' }}>
                {formatDateSk(date)} o {time}
            </p>
            <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.9rem', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '1.2rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> {service.duration_minutes} min</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Euro size={14} /> {service.price.toFixed(2).replace('.', ',')} €</span>
            </p>
        </>
    );
}

/** Builds the dashboard confirmation URL for a chosen slot. */
export function confirmationPath(serviceId: string, date: string, time: string) {
    return `/dashboard/cosmetics/potvrdenie?sluzba=${encodeURIComponent(serviceId)}` +
        `&datum=${encodeURIComponent(date)}&cas=${encodeURIComponent(time)}`;
}
