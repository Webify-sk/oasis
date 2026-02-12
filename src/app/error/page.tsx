'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

function ErrorContent() {
    const searchParams = useSearchParams();
    const message = searchParams.get('message');

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '2rem',
            backgroundColor: '#FCFBF9',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <h1 style={{ fontFamily: "var(--font-heading)", color: '#93745F' }}>Nastala chyba</h1>
            <p style={{ color: '#666' }}>
                {message ? message : 'Pri prihlasovaní alebo registrácii sa vyskytla chyba.'}
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <Link href="/">
                    <Button variant="primary">Skúsiť znova</Button>
                </Link>
            </div>
        </div>
    );
}

export default function ErrorPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ErrorContent />
        </Suspense>
    )
}
