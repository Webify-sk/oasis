'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';
import styles from './VoucherDashboard.module.css';

export function VoucherRedemption() {
    const [code, setCode] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const supabase = createClient();

    async function handleRedeem() {
        if (!code) return;
        setIsPending(true);
        setMessage(null);

        try {
            const { data, error } = await supabase.rpc('redeem_voucher', { code_input: code });

            if (error) {
                setMessage({ type: 'error', text: error.message });
            } else if (data && data.success) {
                setMessage({ type: 'success', text: data.message });
                setCode('');
                window.location.reload();
            } else {
                setMessage({ type: 'error', text: data?.message || 'Chyba pri uplatňovaní.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Nepodarilo sa spojiť so serverom.' });
        } finally {
            setIsPending(false);
        }
    }

    return (
        <div className={styles.redemptionCard}>
            <h3 className={styles.redemptionTitle}>Uplatniť Voucher</h3>
            <div className={styles.redemptionRow}>
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ABC12345"
                    className={styles.redemptionInput}
                />
                <button
                    onClick={handleRedeem}
                    disabled={isPending || !code}
                    className={styles.redemptionButton}
                >
                    {isPending ? <Loader2 className="animate-spin" size={20} /> : 'Uplatniť'}
                </button>
            </div>
            {message && (
                <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: message.type === 'success' ? '#065f46' : '#991b1b' }}>
                    {message.text}
                </div>
            )}
        </div>
    );
}
