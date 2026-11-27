import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { verifyUnsubscribeToken } from '@/utils/newsletter';
import { unsubscribeFormAction } from './actions';

export const metadata: Metadata = {
    title: 'Odhlásenie z newslettera | Oasis Lounge',
    robots: { index: false, follow: false },
};

// Opening the link only shows this page. The unsubscribe itself happens on the
// button press: mail scanners open every link in a message, and a link that
// unsubscribed on open would unsubscribe people who never clicked it.
export default async function UnsubscribePage({
    searchParams,
}: {
    searchParams: Promise<{ u?: string; t?: string; stav?: string }>;
}) {
    const { u = '', t = '', stav } = await searchParams;
    const valid = verifyUnsubscribeToken(u, t);

    let heading = 'Odhlásenie z newslettera';
    let text = 'Naozaj si neželáte dostávať novinky z Oasis Lounge? E-maily k vašim rezerváciám, faktúram a účtu vám budú chodiť ďalej.';
    let button: { label: string; subscribe: boolean } | null = { label: 'Odhlásiť z newslettera', subscribe: false };

    if (!valid) {
        heading = 'Odkaz nie je platný';
        text = 'Tento odkaz na odhlásenie je neúplný alebo poškodený. Otvorte ho, prosím, znova priamo z e-mailu.';
        button = null;
    } else if (stav === 'odhlasene') {
        heading = 'Boli ste odhlásený';
        text = 'Newsletter vám už posielať nebudeme. E-maily k rezerváciám, faktúram a účtu vám budú chodiť ďalej. Ak ste sa odhlásili omylom, môžete odber obnoviť.';
        button = { label: 'Obnoviť odber', subscribe: true };
    } else if (stav === 'prihlasene') {
        heading = 'Odber je obnovený';
        text = 'Novinky z Oasis Lounge vám budú opäť chodiť.';
        button = null;
    } else if (stav === 'chyba') {
        heading = 'Nepodarilo sa to uložiť';
        text = 'Skúste to, prosím, o chvíľu znova.';
    }

    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '1.5rem',
            backgroundColor: '#FCFBF9',
            padding: '2rem',
            textAlign: 'center',
        }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo_Brown.png" alt="Oasis Lounge" style={{ width: '150px', height: 'auto' }} />
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 'normal', color: '#93745F', margin: 0 }}>{heading}</h1>
            <p style={{ color: '#555', maxWidth: '460px', lineHeight: 1.6, margin: 0 }}>{text}</p>

            {button && (
                <form action={unsubscribeFormAction}>
                    <input type="hidden" name="u" value={u} />
                    <input type="hidden" name="t" value={t} />
                    <input type="hidden" name="subscribe" value={button.subscribe ? '1' : '0'} />
                    <Button type="submit" variant="primary">{button.label}</Button>
                </form>
            )}
        </main>
    );
}
