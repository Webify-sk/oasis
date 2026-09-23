import Image from 'next/image';
import Link from 'next/link';
import { Clock, Euro } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { getPublicServiceInfo } from '@/actions/public-cosmetics';
import { BookingConfirmation } from '@/components/public/BookingConfirmation';
import { formatDateSk } from '@/utils/format-date';

// Availability and session state must be fresh on every visit.
export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const BRAND = '#93745F';
const GREEN = '#5E715D';

const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

/**
 * Hand-off from the public calendar. The visitor already picked the service, day and time,
 * so this page either asks them to sign in / register (keeping the choice) or lets them
 * confirm it with one click.
 */
export default async function ReservationPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const serviceId = str(params.sluzba);
    const date = str(params.datum);
    const time = str(params.cas);

    const validInput =
        !!serviceId && !!date && !!time &&
        /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time);

    const service = validInput ? await getPublicServiceInfo(serviceId) : null;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let isStaff = false;
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        isStaff = profile?.role === 'employee' || profile?.role === 'admin';
    }

    const selfUrl = `/rezervacia?sluzba=${encodeURIComponent(serviceId || '')}` +
        `&datum=${encodeURIComponent(date || '')}&cas=${encodeURIComponent(time || '')}`;
    const loginUrl = `/?redirect=${encodeURIComponent(selfUrl)}`;
    const registerUrl = `${loginUrl}&mode=register`;

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
            backgroundColor: '#FCFBF9', padding: '2rem 1rem'
        }}>
            <Image src="/Logo_Brown.png" alt="Oasis Lounge" width={220} height={82}
                style={{ maxWidth: '60%', height: 'auto', marginBottom: '1.5rem' }} priority />

            <div style={{
                width: '100%', maxWidth: '480px', backgroundColor: 'white', borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)', padding: '1.75rem', boxSizing: 'border-box'
            }}>
                {!service ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', margin: 0 }}>
                        Odkaz na rezerváciu je neúplný alebo procedúra už nie je v ponuke.
                    </p>
                ) : (
                    <>
                        {/* Summary card — identical for every state, so the visitor never loses sight of the choice */}
                        <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700, textAlign: 'center' }}>
                            Vaša rezervácia
                        </p>
                        <h1 style={{ margin: '0 0 0.6rem 0', fontSize: '1.35rem', color: BRAND, textAlign: 'center', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                            {service.title}
                        </h1>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 700, color: '#111827', textAlign: 'center' }}>
                            {formatDateSk(date!)} o {time}
                        </p>
                        <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.9rem', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '1.2rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> {service.duration_minutes} min</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Euro size={14} /> {service.price.toFixed(2).replace('.', ',')} €</span>
                        </p>

                        {!user ? (
                            <>
                                <p style={{ color: '#374151', lineHeight: 1.55, margin: '0 0 1.25rem 0', textAlign: 'center', fontSize: '0.95rem' }}>
                                    Na dokončenie rezervácie potrebujete konto v Oasis Lounge.
                                    Po prihlásení alebo registrácii sa sem vrátite a termín potvrdíte jedným kliknutím.
                                </p>
                                <Link href={loginUrl} style={{
                                    display: 'block', textAlign: 'center', backgroundColor: GREEN, color: 'white',
                                    padding: '0.9rem', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', marginBottom: '0.7rem'
                                }}>
                                    Už mám konto – prihlásiť sa
                                </Link>
                                <Link href={registerUrl} style={{
                                    display: 'block', textAlign: 'center', backgroundColor: 'white', color: GREEN,
                                    border: `2px solid ${GREEN}`, padding: '0.8rem', borderRadius: '8px', fontWeight: 700, textDecoration: 'none'
                                }}>
                                    Som tu prvýkrát – zaregistrovať sa
                                </Link>
                                <p style={{ margin: '1rem 0 0 0', fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center' }}>
                                    Registrácia trvá asi dve minúty.
                                </p>
                            </>
                        ) : isStaff ? (
                            <p style={{ color: '#6b7280', textAlign: 'center', margin: 0, fontSize: '0.92rem' }}>
                                Ste prihlásení ako zamestnanec — klientske rezervácie sa z tohto konta nevytvárajú.
                                Termín pre klientku zadajte v <Link href="/admin/cosmetics/reservations" style={{ color: BRAND }}>administrácii</Link>.
                            </p>
                        ) : (
                            <BookingConfirmation service={service} date={date!} time={time!} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
