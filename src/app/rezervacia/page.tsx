import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getPublicServiceInfo } from '@/actions/public-cosmetics';
import { BookingSummary, confirmationPath } from '@/components/public/BookingSummary';

// Availability and session state must be fresh on every visit.
export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const GREEN = '#5E715D';

const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

/**
 * Hand-off from the public calendar for visitors WITHOUT a session: shows what they
 * picked and asks them to sign in or register, carrying the choice along. Anyone who
 * is already signed in is sent straight to the confirmation inside the dashboard.
 */
export default async function ReservationPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const serviceId = str(params.sluzba);
    const date = str(params.datum);
    const time = str(params.cas);

    const validInput =
        !!serviceId && !!date && !!time &&
        /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && validInput) {
        redirect(confirmationPath(serviceId, date, time));
    }

    const service = validInput ? await getPublicServiceInfo(serviceId) : null;

    // Login and signup both return to the dashboard confirmation, not back here.
    const target = validInput ? confirmationPath(serviceId, date, time) : '/dashboard/cosmetics';
    const loginUrl = `/?redirect=${encodeURIComponent(target)}`;
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
                        <BookingSummary service={service} date={date!} time={time!} />

                        <p style={{ color: '#374151', lineHeight: 1.55, margin: '0 0 1.25rem 0', textAlign: 'center', fontSize: '0.95rem' }}>
                            Na dokončenie rezervácie potrebujete konto v Oasis Lounge.
                            Po prihlásení alebo registrácii termín potvrdíte jedným kliknutím.
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
                )}
            </div>
        </div>
    );
}
