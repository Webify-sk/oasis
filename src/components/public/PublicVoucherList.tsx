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
        // Redirect to dashboard vouchers page
        window.open(`${baseUrl}/dashboard/gift-vouchers?productId=${productId}`, '_blank');
    };

    // Helper to get image based on category or title
    const getBackgroundImage = (voucher: VoucherProduct) => {
        const title = voucher.title.toLowerCase();
        const category = (voucher.category || '').toLowerCase();

        if (title.includes('glow') || category.includes('kozmetika') || title.includes('skin') || title.includes('pleť')) {
            return 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=2070&auto=format&fit=crop'; // Spa / Facial
        }
        if (title.includes('body') || category.includes('telo') || title.includes('masáž')) {
            return 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop'; // Massage / Body
        }
        if (title.includes('movement') || category.includes('pilates') || title.includes('cvičenie') || title.includes('joga')) {
            return 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=2070&auto=format&fit=crop'; // Pilates / Exercise
        }
        if (title.includes('smooth') || category.includes('epilácia')) {
            return 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?q=80&w=2070&auto=format&fit=crop'; // Smooth skin
        }

        // Default fallback
        return 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=2070&auto=format&fit=crop';
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            padding: '1rem'
        }}>
            {vouchers.map((voucher) => {
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
                        {/* Background Image */}
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

                        {/* Overlay */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(to bottom, rgba(94, 80, 74, 0.4), rgba(94, 80, 74, 0.7))', // Brownish overlay
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '1.5rem',
                            textAlign: 'center'
                        }}>
                            <span style={{
                                color: 'rgba(255,255,255,0.9)',
                                fontSize: '0.9rem',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                marginBottom: '0.5rem',
                                fontFamily: 'sans-serif'
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
                                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                            }}>
                                {voucher.title}
                            </h3>
                            <div style={{
                                marginTop: '1rem',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '1.1rem'
                            }}>
                                {voucher.price} €
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
