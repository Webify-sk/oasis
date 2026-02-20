'use client';

import { useState } from 'react';
import { formatDate } from '@/utils/date';
import clsx from 'clsx';
import { Search, Mail, Tag, Users, CheckCircle, Clock } from 'lucide-react';

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
    target_user?: TargetUser;
    creator?: Creator;
}

export function CouponList({ coupons }: { coupons: Coupon[] }) {
    const [searchTerm, setSearchTerm] = useState('');

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
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
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
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                <span style={{ color: '#374151', fontWeight: 500 }}>
                                                    {coupon.target_user?.full_name || 'Neznámy'}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: '#6b7280' }}>
                                                    <Mail size={14} />
                                                    {coupon.target_user?.email || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {coupon.used ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.8rem', backgroundColor: '#f3f4f6', color: '#6b7280', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 500 }}>
                                                    <CheckCircle size={14} /> Uplatnený
                                                </span>
                                            ) : coupon.active ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.8rem', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 500 }}>
                                                    <Clock size={14} /> Aktívny (Čaká)
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.8rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 500 }}>
                                                    Zrušený
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                {formatDate(coupon.created_at)}
                                                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>od: {coupon.creator?.full_name || 'Admin'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
