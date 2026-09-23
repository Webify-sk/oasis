import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getPublicServiceInfo } from '@/actions/public-cosmetics';
import { BookingConfirmation } from '@/components/public/BookingConfirmation';
import { BookingSummary } from '@/components/public/BookingSummary';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

/**
 * One-click confirmation of a slot picked in the public calendar. Lives inside the
 * dashboard so a signed-in client sees it with their usual navigation; the middleware
 * already guarantees a session here.
 */
export default async function BookingConfirmationPage({ searchParams }: PageProps) {
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

    return (
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '1rem' }}>
            <div style={{
                backgroundColor: 'white', borderRadius: '16px', padding: '1.75rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)', boxSizing: 'border-box'
            }}>
                {!service ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', margin: 0 }}>
                        Odkaz na rezerváciu je neúplný alebo procedúra už nie je v ponuke.{' '}
                        <Link href="/dashboard/cosmetics" style={{ color: '#93745F', fontWeight: 600 }}>Vybrať procedúru</Link>
                    </p>
                ) : (
                    <>
                        <BookingSummary service={service} date={date!} time={time!} />
                        {isStaff ? (
                            <p style={{ color: '#6b7280', textAlign: 'center', margin: 0, fontSize: '0.92rem' }}>
                                Ste prihlásení ako zamestnanec — klientske rezervácie sa z tohto konta nevytvárajú.
                                Termín pre klientku zadajte v <Link href="/admin/cosmetics/reservations" style={{ color: '#93745F' }}>administrácii</Link>.
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
