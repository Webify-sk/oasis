'use client';

import { useState } from 'react';
import { resendVerification } from '@/app/auth/actions';
import { Loader2 } from 'lucide-react';

interface VerificationBannerProps {
    isVerified: boolean;
}

export function VerificationBanner({ isVerified }: VerificationBannerProps) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    if (isVerified) return null;

    async function handleResend() {
        setLoading(true);
        setMessage(null);

        const result = await resendVerification();

        setLoading(false);

        if (result?.error) {
            alert(result.error);
        } else if (result?.message) {
            setMessage(result.message);
            setTimeout(() => setMessage(null), 5000);
        }
    }

    return (
        <div style={{
            backgroundColor: '#FEFCE8',
            borderBottom: '1px solid #FEF08A',
            padding: '0.75rem 1rem',
            color: '#854D0E',
            fontSize: '0.9rem',
            textAlign: 'center',
            fontWeight: 500,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem'
        }}>
            <span>⚠️ Váš email nie je overený. Pre plný prístup (rezervácie) prosím potvrďte svoj email cez odkaz, ktorý sme Vám poslali.</span>

            {message ? (
                <span style={{ color: '#166534', fontWeight: 600 }}>✅ {message}</span>
            ) : (
                <button
                    onClick={handleResend}
                    disabled={loading}
                    style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #854D0E',
                        borderRadius: '4px',
                        padding: '0.25rem 0.75rem',
                        color: '#854D0E',
                        fontSize: '0.8rem',
                        cursor: loading ? 'wait' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    {loading ? 'Odosielam...' : 'Poslať email znovu'}
                </button>
            )}
        </div>
    );
}
