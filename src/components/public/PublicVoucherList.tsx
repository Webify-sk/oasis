'use client';

import { useState } from 'react';
import { PublicVoucherPurchaseForm } from './PublicVoucherPurchaseForm';

interface VoucherProduct {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    price: number;
    credit_amount: number;
}

interface PublicVoucherListProps {
    vouchers: VoucherProduct[];
    success?: boolean;
    canceled?: boolean;
}

export function PublicVoucherList({ vouchers, success, canceled }: PublicVoucherListProps) {
    const [selectedProduct, setSelectedProduct] = useState<VoucherProduct | null>(null);

    const handleBuy = (product: VoucherProduct) => {
        setSelectedProduct(product);
    };

    // Sections follow the category set in the admin. Guessing from the title put every
    // "…balíček" into beauty, including the pilates packages.
    const isTraining = (v: VoucherProduct) => {
        const c = (v.category || '').toLowerCase();
        if (c) return c.includes('train') || c.includes('trén') || c.includes('pohyb') || c.includes('pilates');
        // No category set: fall back to the title
        const t = v.title.toLowerCase();
        return t.includes('pilates') || t.includes('tréning') || t.includes('trening') || t.includes('vstup');
    };

    // Photos are served from our own /public/vouchers — the stock-photo links this used
    // to point at can disappear (the pilates one did, leaving an empty card).
    const getBackgroundImage = (voucher: VoucherProduct) => {
        const t = voucher.title.toLowerCase();
        if (isTraining(voucher)) {
            return '/vouchers/training.png';
        }
        if (t.includes('masáž') || t.includes('masaz') || t.includes('body') || t.includes('telo') || t.includes('rituál')) {
            return '/vouchers/massage.jpg';
        }
        return '/vouchers/beauty.jpg';
    };

    const trainingVouchers = vouchers.filter(isTraining);
    const beautyVouchers = vouchers.filter(v => !isTraining(v));

    const renderGrid = (items: VoucherProduct[]) => (
        <div style={{
            display: 'grid',
            // auto-fill (not auto-fit): a lone card keeps its size instead of stretching full width
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
            gap: '1.5rem',
        }}>
            {items.map((voucher) => {
                const bgImage = getBackgroundImage(voucher);
                return (
                    <div
                        key={voucher.id}
                        onClick={() => handleBuy(voucher)}
                        style={{
                            borderRadius: '16px',
                            overflow: 'hidden',
                            position: 'relative',
                            aspectRatio: '16/9',
                            cursor: 'pointer',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: `url(${bgImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}></div>

                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(to bottom, rgba(60, 50, 46, 0.5), rgba(60, 50, 46, 0.72))',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '1.5rem',
                            textAlign: 'center'
                        }}>
                            <span style={{
                                color: 'rgba(255,255,255,0.95)',
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                marginBottom: '0.5rem',
                                fontFamily: 'sans-serif',
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                            }}>
                                {voucher.category || 'Darčekový poukaz'}
                            </span>
                            <h3 style={{
                                color: 'white',
                                fontSize: '1.75rem',
                                fontFamily: 'serif',
                                fontWeight: 'normal',
                                margin: 0,
                                lineHeight: 1.2,
                                textShadow: '0 2px 4px rgba(0,0,0,0.4)'
                            }}>
                                {voucher.title}
                            </h3>
                            <div style={{
                                marginTop: '1rem',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '1.1rem',
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                            }}>
                                {voucher.price} €
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    if (selectedProduct) {
        return (
            <PublicVoucherPurchaseForm
                product={selectedProduct}
                onBack={() => setSelectedProduct(null)}
            />
        );
    }

    return (
        <div style={{ padding: '1rem' }}>
            {success && (
                <div style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #16A34A',
                    color: '#166534',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '2rem',
                    textAlign: 'center',
                    fontFamily: 'sans-serif'
                }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
                        🎉 Platba úspešná!
                    </h3>
                    <p style={{ margin: 0 }}>
                        Ďakujeme za váš nákup. Darčekový poukaz bol vygenerovaný a odoslaný na email obdarovaného.
                    </p>
                </div>
            )}

            {beautyVouchers.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                    <h2 style={{
                        fontFamily: 'serif',
                        color: '#5E504A',
                        fontSize: '2rem',
                        marginBottom: '1.5rem',
                        borderBottom: '1px solid rgba(94, 80, 74, 0.2)',
                        paddingBottom: '0.5rem'
                    }}>
                        Krása a Relax
                    </h2>
                    {renderGrid(beautyVouchers)}
                </div>
            )}

            {trainingVouchers.length > 0 && (
                <div>
                    <h2 style={{
                        fontFamily: 'serif',
                        color: '#5E504A',
                        fontSize: '2rem',
                        marginBottom: '1.5rem',
                        borderBottom: '1px solid rgba(94, 80, 74, 0.2)',
                        paddingBottom: '0.5rem'
                    }}>
                        Pohyb a Tréning
                    </h2>
                    {renderGrid(trainingVouchers)}
                </div>
            )}
        </div>
    );
}
