'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { sendPasswordChangedNotification } from '@/app/auth/actions';

function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [sessionReady, setSessionReady] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (isMounted && session) {
                console.log('Initial session found');
                setSessionReady(true);
            } else if (isMounted) {
                // Sometimes the session is already there but took a moment or we are waiting for the hash
                // If there's an error or no session immediately, we still wait for onAuthStateChange
                console.log('No immediate session, waiting for auth state change or hash processing...');
            }
        };

        checkSession();

        // Listen for changes (this fires when the URL hash is processed by Supabase)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth Event:', event);
            if (isMounted && session) {
                setSessionReady(true);
            }
        });

        // Fallback: If after 3 seconds we still don't have a session, maybe the user is already logged in 
        // or the link was invalid. We'll enable the form anyway and let the submission fail with a clear error
        // if they really don't have a session, rather than locking them out forever.
        // Actually, for recovery, we MUST have a session.
        const timeoutId = setTimeout(() => {
            if (isMounted) {
                setSessionReady(true); // Allow them to try, better than indefinite hang
            }
        }, 3000);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(timeoutId);
        };
    }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!sessionReady) {
            setError('Nepodarilo sa obnoviť reláciu. Skúste kliknúť na link v emaile znova.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Heslá sa nezhodujú.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const { data: { user }, error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            // Send notification email
            if (user?.email) {
                await sendPasswordChangedNotification(user.email);
            }

            setMessage('Heslo bolo úspešne zmenené.');
            setTimeout(() => {
                router.push('/dashboard/profile');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Chyba pri zmene hesla.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#5E715D' }}>Nastavenie nového hesla</h1>

            {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
            {message && <p style={{ color: 'green', marginBottom: '1rem' }}>{message}</p>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                    type="password"
                    placeholder="Nové heslo"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ padding: '0.8rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    disabled={!sessionReady}
                />

                <input
                    type="password"
                    placeholder="Potvrdenie hesla"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ padding: '0.8rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    disabled={!sessionReady}
                />

                <button
                    type="submit"
                    disabled={loading || !sessionReady}
                    className="button"
                    style={{
                        backgroundColor: sessionReady ? '#5E715D' : '#ccc',
                        color: 'white',
                        padding: '0.8rem',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {loading ? 'Ukladám...' : (sessionReady ? 'Uložiť heslo' : 'Načítavam reláciu...')}
                </button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Načítavam...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
