'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        // Handle the hash fragment from Supabase (Implicit Grant)
        const handleHash = async () => {
            if (window.location.hash && window.location.hash.includes('access_token')) {
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('Session error:', error);
                    setError('Nepodarilo sa overiť reláciu. Skúste znova.');
                }
            }
        };
        handleHash();
    }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

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
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="button"
                    style={{
                        backgroundColor: '#5E715D',
                        color: 'white',
                        padding: '0.8rem',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {loading ? 'Ukladám...' : 'Uložiť heslo'}
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
