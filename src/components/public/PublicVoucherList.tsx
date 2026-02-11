'use client';

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
}

export function PublicVoucherList({ vouchers }: PublicVoucherListProps) {
    const handleBuy = (productId: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk';
        window.open(`${baseUrl}/dashboard/gift-vouchers?productId=${productId}`, '_blank');
    };

    const isBeauty = (v: VoucherProduct) => {
        const t = v.title.toLowerCase();
        const c = (v.category || '').toLowerCase();
        return t.includes('glow') ||
            c.includes('kozmetika') ||
            c.includes('beauty') ||
            t.includes('skin') ||
            t.includes('pleť') ||
            t.includes('body') ||
            c.includes('telo') ||
            t.includes('masáž') ||
            t.includes('masaz') ||
            t.includes('beauty') ||
            t.includes('manik') ||
            t.includes('pedik') ||
            c.includes('epilácia') ||
            t.includes('epil') ||
            t.includes('smooth') ||
            t.includes('balíček') ||
            t.includes('balicek') ||
            t.includes('mega');
    };

    const getBackgroundImage = (voucher: VoucherProduct) => {
        if (isBeauty(voucher)) {
            const t = voucher.title.toLowerCase();
            if (t.includes('body') || t.includes('telo') || t.includes('masáž') || t.includes('masaz')) {
                return 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop';
            }
            if (t.includes('smooth') || t.includes('epil')) {
                return 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?q=80&w=2070&auto=format&fit=crop';
            }
            // Default Beauty
            return 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=2070&auto=format&fit=crop';
        } else {
            const t = voucher.title.toLowerCase();
            if (t.includes('yoga') || t.includes('pilates') || t.includes('joga')) {
                return 'https://images.unsplash.com/photo-1599447421405-0c323d275204?q=80&w=2070&auto=format&fit=crop';
            }
            if (t.includes('viano') || t.includes('gift') || t.includes('darček')) {
                // Festive / Gift
                return 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?q=80&w=2070&auto=format&fit=crop';
            }
            // Default Training / Gym
            return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop';
        }
    };

    const beautyVouchers = vouchers.filter(isBeauty);
    const trainingVouchers = vouchers.filter(v => !isBeauty(v));

    const renderGrid = (items: VoucherProduct[]) => (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
        }}>
            {items.map((voucher) => {
                const bgImage = getBackgroundImage(voucher);
                return (
                    <div
                        key={voucher.id}
                        onClick={() => handleBuy(voucher.id)}
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
                            background: 'linear-gradient(to bottom, rgba(94, 80, 74, 0.3), rgba(94, 80, 74, 0.6))',
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

    return (
        <div style={{ padding: '1rem' }}>
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
