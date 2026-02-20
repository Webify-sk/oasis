'use client';

import { useState } from 'react';
import { formatDate } from '@/utils/date';
import clsx from 'clsx';
import { Search, Mail, Tag, Users, CheckCircle, Clock, Globe, Calendar, Activity } from 'lucide-react';
import { toggleCouponStatusAction } from '@/app/admin/coupons/actions';

interface TargetUser {
    full_name: string | null;
    email: string | null;
}

interface Creator {
    full_name: string | null;
}

interface Coupon {
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    active: boolean;
    used: boolean;
    used_at: string | null;
    created_at: string;
    target_user_id: string | null;
    valid_from: string | null;
    valid_until: string | null;
    usage_count: number;
    target_user?: TargetUser;
    creator?: Creator;
}

export function CouponList({ coupons }: { coupons: Coupon[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeactivating, setIsDeactivating] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, couponId: string | null, newStatus: boolean }>({ isOpen: false, couponId: null, newStatus: false });

    const handleToggleConfirm = async () => {
        if (!confirmModal.couponId) return;

        setIsDeactivating(confirmModal.couponId);
        try {
            const result = await toggleCouponStatusAction(confirmModal.couponId, confirmModal.newStatus);
            if (result?.error) {
                alert(result.error);
            } else {
                setConfirmModal({ isOpen: false, couponId: null, newStatus: false });
            }
        } catch (e) {
            alert('Nastala chyba pri zmene stavu.');
        } finally {
            setIsDeactivating(null);
        }
    };

    const handleToggleQuery = (id: string, newStatus: boolean) => {
        setConfirmModal({ isOpen: true, couponId: id, newStatus });
    };

    const filteredCoupons = coupons.filter(coupon => {
        const term = searchTerm.toLowerCase();
        return (
            coupon.code.toLowerCase().includes(term) ||
            coupon.target_user?.full_name?.toLowerCase().includes(term) ||
            coupon.target_user?.email?.toLowerCase().includes(term)
        );
    });

    const formatDiscount = (type: string, value: number) => {
        if (type === 'percentage') return `${value}%`;
        return `${value} €`;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'white',
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text"
                        placeholder="Hľadať podľa kódu alebo mena..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.6rem 1rem 0.6rem 2.5rem',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            outline: 'none',
                            fontSize: '0.9rem',
                            transition: 'border-color 0.2s'
                        }}
                    />
                </div>
            </div>

            {/* List */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kód & Zľava</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pre Užívateľa</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vytvorené</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Akcie</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                                        Žiadne kupóny neboli nájdené.
                                    </td>
                                </tr>
                            ) : (
                                filteredCoupons.map((coupon) => (
                                    <tr key={coupon.id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                <span style={{ fontWeight: 600, color: '#111827', fontFamily: 'monospace', fontSize: '1.1rem' }}>{coupon.code}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: '#6b7280' }}>
                                                    <Tag size={14} />
                                                    {coupon.discount_type === 'percentage' ? 'Percentuálna' : 'Presná suma'}: <strong>{formatDiscount(coupon.discount_type, coupon.discount_value)}</strong>
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {coupon.target_user_id === null ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                    <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <Globe size={16} /> Univerzálny kupón
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#6b7280' }}>
                                                        <Calendar size={14} />
                                                        {coupon.valid_from && coupon.valid_until ? `${formatDate(coupon.valid_from)} - ${formatDate(coupon.valid_until)}` : 'Neobmedzená platnosť'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                    <span style={{ color: '#374151', fontWeight: 500 }}>
                                                        {coupon.target_user?.full_name || 'Neznámy'}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: '#6b7280' }}>
                                                        <Mail size={14} />
                                                        {coupon.target_user?.email || '-'}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <div>
                                                    {!coupon.active ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.8rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 500 }}>
                                                            Zrušený
                                                        </span>
                                                    ) : coupon.target_user_id === null ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.8rem', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 500 }}>
                                                            <Clock size={14} /> Aktívny
                                                        </span>
                                                    ) : coupon.used ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.8rem', backgroundColor: '#f3f4f6', color: '#6b7280', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 500 }}>
                                                            <CheckCircle size={14} /> Uplatnený
                                                        </span>
                                                    ) : (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.8rem', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 500 }}>
                                                            <Clock size={14} /> Aktívny (Čaká)
                                                        </span>
                                                    )}
                                                </div>
                                                {coupon.target_user_id === null && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: '#6b7280' }}>
                                                        <Activity size={14} /> Počet použití: <strong>{coupon.usage_count}</strong>
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                {formatDate(coupon.created_at)}
                                                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>od: {coupon.creator?.full_name || 'Admin'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            {!coupon.used && (
                                                <button
                                                    onClick={() => handleToggleQuery(coupon.id, !coupon.active)}
                                                    disabled={isDeactivating === coupon.id}
                                                    style={{
                                                        padding: '0.4rem 0.8rem',
                                                        backgroundColor: 'white',
                                                        border: `1px solid ${coupon.active ? '#ef4444' : '#059669'}`,
                                                        color: coupon.active ? '#ef4444' : '#059669',
                                                        borderRadius: '6px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 500,
                                                        cursor: isDeactivating === coupon.id ? 'not-allowed' : 'pointer',
                                                        opacity: isDeactivating === coupon.id ? 0.5 : 1,
                                                        transition: 'all 0.2s',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        if (isDeactivating !== coupon.id) {
                                                            e.currentTarget.style.backgroundColor = coupon.active ? '#fef2f2' : '#ecfdf5';
                                                        }
                                                    }}
                                                    onMouseOut={(e) => {
                                                        if (isDeactivating !== coupon.id) {
                                                            e.currentTarget.style.backgroundColor = 'white';
                                                        }
                                                    }}
                                                >
                                                    {isDeactivating === coupon.id ? 'Sprac.' : (coupon.active ? 'Zneaktívniť' : 'Aktivovať')}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Overlay */}
            {confirmModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(2px)' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                            {confirmModal.newStatus ? 'Aktivovať kupón' : 'Zneaktívniť kupón'}
                        </h3>
                        <p style={{ margin: '0 0 1.5rem 0', color: '#4b5563', fontSize: '0.95rem', lineHeight: 1.5 }}>
                            {confirmModal.newStatus
                                ? 'Naozaj chcete znovu aktivovať tento kupón? Zákazník ho bude môcť opäť použiť.'
                                : 'Naozaj chcete zneaktívniť tento kupón? Zákazník ho už nebude môcť použiť na vytvorenie objednávky.'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, couponId: null, newStatus: false })}
                                disabled={isDeactivating === confirmModal.couponId}
                                style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#4b5563', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                Zrušiť
                            </button>
                            <button
                                onClick={handleToggleConfirm}
                                disabled={isDeactivating === confirmModal.couponId}
                                style={{
                                    padding: '0.5rem 1.2rem',
                                    backgroundColor: confirmModal.newStatus ? '#059669' : '#ef4444',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontWeight: 500,
                                    cursor: isDeactivating === confirmModal.couponId ? 'not-allowed' : 'pointer',
                                    opacity: isDeactivating === confirmModal.couponId ? 0.7 : 1,
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                onMouseOver={(e) => {
                                    if (isDeactivating !== confirmModal.couponId) {
                                        e.currentTarget.style.backgroundColor = confirmModal.newStatus ? '#047857' : '#dc2626';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (isDeactivating !== confirmModal.couponId) {
                                        e.currentTarget.style.backgroundColor = confirmModal.newStatus ? '#059669' : '#ef4444';
                                    }
                                }}
                            >
                                {isDeactivating === confirmModal.couponId ? 'Spracúva sa...' : (confirmModal.newStatus ? 'Aktivovať' : 'Zneaktívniť')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
