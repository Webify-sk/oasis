'use client';

import { useState } from 'react';
import { verifyDashboardCode, redeemBeautyVoucher, invalidateDiscountCoupon } from '@/actions/voucher-actions';
import { Loader2, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

interface CodeDetails {
    type: 'voucher' | 'coupon';
    code: string;
    created_at: string;
    // Voucher fields
    is_redeemed?: boolean;
    redeemed_at?: string | null;
    product?: {
        title: string;
        category: string;
        price: number;
    };
    // Coupon fields
    id?: string;
    discount_type?: 'percentage' | 'fixed';
    discount_value?: number;
    active?: boolean;
    used?: boolean;
    is_valid?: boolean;
    valid_from?: string | null;
    valid_until?: string | null;
    target_user_id?: string | null;
    usage_limit?: number | null;
}

export function VoucherCheck() {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'checking' | 'redeeming' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [voucher, setVoucher] = useState<CodeDetails | null>(null);

    async function handleCheck(e: React.FormEvent) {
        e.preventDefault();
        if (!code.trim()) return;

        setStatus('checking');
        setMessage('');
        setVoucher(null);

        try {
            const res = await verifyDashboardCode(code.trim().toUpperCase());
            if (res.success && res.data) {
                setVoucher(res.data as CodeDetails);
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

    async function handleInvalidate() {
        if (!code || !voucher || voucher.type !== 'coupon') return;

        setStatus('redeeming');
        try {
            const res = await invalidateDiscountCoupon(code.trim().toUpperCase());
            if (res.success) {
                setVoucher(prev => prev ? { ...prev, active: false, is_valid: false } : null);
                setStatus('success');
                setMessage('Kupón bol úspešne zneaktívnený.');
            } else {
                setStatus('error');
                setMessage(res.message || 'Chyba pri zneaktívňovaní.');
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
                    backgroundColor: (voucher.type === 'voucher' ? voucher.is_redeemed : !voucher.is_valid) ? '#f9fafb' : '#ecfdf5',
                    border: (voucher.type === 'voucher' ? voucher.is_redeemed : !voucher.is_valid) ? '1px solid #e5e7eb' : '1px solid #a7f3d0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div>
                            <h4 style={{ margin: '0 0 0.3rem 0', color: '#1f2937', fontSize: '1.1rem' }}>
                                {voucher.type === 'voucher' ? voucher.product?.title : 'Zľavový Kupón'}
                            </h4>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                                {voucher.type === 'voucher'
                                    ? (voucher.product?.category === 'Beauty' ? '💄 Beauty Voucher' : '🏋️ Tréningový Voucher')
                                    : '🎟️ Zľava na nákup'}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            {(voucher.type === 'voucher' ? voucher.is_redeemed : !voucher.is_valid) ? (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                    padding: '0.3rem 0.8rem', borderRadius: '20px',
                                    backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600
                                }}>
                                    <XCircle size={14} /> {voucher.type === 'voucher' ? 'Použitý' : (voucher.used ? 'Použitý' : 'Neplatný')}
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
                        {voucher.type === 'voucher' ? (
                            <>
                                <div><strong>Hodnota:</strong> {voucher.product?.price} €</div>
                                <div><strong>Vytvorený:</strong> {new Date(voucher.created_at).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                {voucher.redeemed_at && (
                                    <div><strong>Uplatnený:</strong> {new Date(voucher.redeemed_at).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                )}
                            </>
                        ) : (
                            <>
                                <div><strong>Zľava:</strong> {voucher.discount_type === 'percentage' ? `${voucher.discount_value} %` : `${voucher.discount_value} €`}</div>
                                <div><strong>Vytvorený:</strong> {new Date(voucher.created_at).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                {voucher.valid_until && (
                                    <div><strong>Platný do:</strong> {new Date(voucher.valid_until).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                )}
                            </>
                        )}
                    </div>

                    {voucher.type === 'voucher' && !voucher.is_redeemed && (
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

                    {voucher.type === 'coupon' && voucher.active && !voucher.used && !(voucher.target_user_id === null && (voucher.usage_limit === undefined || voucher.usage_limit === null || voucher.usage_limit === 0)) && (
                        <button
                            onClick={handleInvalidate}
                            disabled={status === 'redeeming'}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#dc2626',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                opacity: status === 'redeeming' ? 0.7 : 1,
                                marginTop: '0.5rem'
                            }}
                        >
                            {status === 'redeeming' ? (
                                <>Zneaktívňujem...</>
                            ) : (
                                <>
                                    <XCircle size={18} />
                                    Zneaktívniť kupón
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
