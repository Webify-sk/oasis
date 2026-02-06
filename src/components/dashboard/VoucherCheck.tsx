'use client';

import { useState } from 'react';
import { checkVoucher, redeemBeautyVoucher } from '@/actions/voucher-actions';
import { Loader2, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

interface VoucherDetails {
    code: string;
    is_redeemed: boolean;
    redeemed_at: string | null;
    product: {
        title: string;
        category: string;
        price: number;
    };
    created_at: string;
}

export function VoucherCheck() {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'checking' | 'redeeming' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [voucher, setVoucher] = useState<VoucherDetails | null>(null);

    async function handleCheck(e: React.FormEvent) {
        e.preventDefault();
        if (!code.trim()) return;

        setStatus('checking');
        setMessage('');
        setVoucher(null);

        try {
            const res = await checkVoucher(code.trim().toUpperCase());
            if (res.success && res.data) {
                setVoucher(res.data as unknown as VoucherDetails);
                setStatus('success');
            } else {
                setStatus('error');
                setMessage(res.message || 'Chyba pri overovaní.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Chyba servera.');
        }
    }

    async function handleRedeem() {
        if (!code || !voucher) return;

        setStatus('redeeming');
        try {
            const res = await redeemBeautyVoucher(code.trim().toUpperCase());
            if (res.success) {
                // Update local state to reflect redemption
                setVoucher(prev => prev ? { ...prev, is_redeemed: true, redeemed_at: new Date().toISOString() } : null);
                setStatus('success');
                setMessage('Voucher bol úspešne uplatnený.');
            } else {
                setStatus('error');
                setMessage(res.message || 'Chyba pri uplatňovaní.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Chyba servera.');
        }
    }

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid #f0f0f0',
            boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Overenie Vouchera
            </h3>

            <form onSubmit={handleCheck} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', width: '100%' }}>
                <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Kód vouchera (napr. ABC12345)"
                    style={{
                        flex: 1,
                        padding: '0.8rem',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        minWidth: 0, // CRITICAL FIX for flex overflow
                        width: '100%' // Ensure it takes available space
                    }}
                />
                <button
                    type="submit"
                    disabled={status === 'checking' || !code.trim()}
                    style={{
                        padding: '0.8rem', // Reduced padding
                        borderRadius: '8px',
                        backgroundColor: '#5E715D',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '44px'
                    }}
                >
                    {status === 'checking' ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
            </form>

            {message && status === 'error' && (
                <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem'
                }}>
                    <AlertCircle size={18} />
                    {message}
                </div>
            )}

            {voucher && (
                <div style={{
                    padding: '1.2rem',
                    borderRadius: '12px',
                    backgroundColor: voucher.is_redeemed ? '#f9fafb' : '#ecfdf5',
                    border: voucher.is_redeemed ? '1px solid #e5e7eb' : '1px solid #a7f3d0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div>
                            <h4 style={{ margin: '0 0 0.3rem 0', color: '#1f2937', fontSize: '1.1rem' }}>
                                {voucher.product.title}
                            </h4>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                                {voucher.product.category === 'Beauty' ? '💄 Beauty Voucher' : '🏋️ Tréningový Voucher'}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            {voucher.is_redeemed ? (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                    padding: '0.3rem 0.8rem', borderRadius: '20px',
                                    backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600
                                }}>
                                    <CheckCircle size={14} /> Použitý
                                </span>
                            ) : (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                    padding: '0.3rem 0.8rem', borderRadius: '20px',
                                    backgroundColor: '#d1fae5', color: '#047857', fontSize: '0.85rem', fontWeight: 600
                                }}>
                                    <CheckCircle size={14} /> Platný
                                </span>
                            )}
                        </div>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: '#4b5563', display: 'grid', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <div><strong>Hodnota:</strong> {voucher.product.price} €</div>
                        <div><strong>Vytvorený:</strong> {format(new Date(voucher.created_at), 'd. MMMM yyyy', { locale: sk })}</div>
                        {voucher.redeemed_at && (
                            <div><strong>Uplatnený:</strong> {format(new Date(voucher.redeemed_at), 'd. MMMM yyyy HH:mm', { locale: sk })}</div>
                        )}
                    </div>

                    {!voucher.is_redeemed && (
                        <button
                            onClick={handleRedeem}
                            disabled={status === 'redeeming'}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#059669',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                opacity: status === 'redeeming' ? 0.7 : 1
                            }}
                        >
                            {status === 'redeeming' ? (
                                <>Uplatňujem...</>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
                                    Uplatniť voucher
                                </>
                            )}
                        </button>
                    )}

                    {message && status === 'success' && message !== '' && (
                        <div style={{ marginTop: '1rem', color: '#059669', fontSize: '0.9rem', textAlign: 'center', fontWeight: 500 }}>
                            {message}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
