'use client';

import { Check } from 'lucide-react';

interface CreditPackage {
    id: string;
    title: string;
    price: number;
    credits: number;
    bonus_credits: number;
    description: string | null;
    validity_months: number | null;
    is_active: boolean;
    is_popular: boolean;
    created_at: string;
}

interface PublicCreditPackagesProps {
    packages: CreditPackage[];
}

export function PublicCreditPackages({ packages }: PublicCreditPackagesProps) {
    const handleBuy = (pkgId: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk';
        // Redirect to dashboard credits page 
        window.open(`${baseUrl}/dashboard/credit?packageId=${pkgId}`, '_blank');
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            padding: '1rem'
        }}>
            {packages.map((pkg) => (
                <div key={pkg.id} style={{
                    backgroundColor: '#5E504A', // Dark brown from image
                    borderRadius: '24px',
                    padding: '2rem 1.5rem',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '380px', // Ensure height match
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                }}>
                    {/* Decorative curves - using CSS radial gradients to mimic the SVG lines */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: '24px',
                        background: `
                            radial-gradient(circle at 100% 100%, transparent 60%, rgba(255,255,255,0.03) 60%, rgba(255,255,255,0.03) 61%, transparent 61%),
                            radial-gradient(circle at 0% 0%, transparent 50%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.03) 51%, transparent 51%)
                        `,
                        pointerEvents: 'none',
                        zIndex: 0
                    }}></div>

                    <div style={{ zIndex: 1, position: 'relative' }}>
                        <h3 style={{
                            fontSize: '1.5rem',
                            fontFamily: 'serif',
                            fontWeight: 'normal',
                            marginBottom: '0.5rem',
                            lineHeight: 1.2
                        }}>
                            {pkg.title}
                        </h3>

                        <div style={{
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            marginBottom: '1rem',
                            opacity: 0.9
                        }}>
                            {pkg.credits} Vstup{pkg.credits === 1 ? '' : (pkg.credits >= 2 && pkg.credits <= 4 ? 'y' : 'ov')}
                            {pkg.bonus_credits > 0 && <span style={{ color: '#86efac', marginLeft: '0.5rem', fontSize: '0.9rem' }}>+{pkg.bonus_credits} bonus</span>}
                        </div>

                        <p style={{
                            fontSize: '0.9rem',
                            lineHeight: 1.5,
                            color: 'rgba(255,255,255,0.8)',
                            marginBottom: '1.5rem',
                            minHeight: '60px' // Ensure alignment
                        }}>
                            {pkg.description || 'Vstup do oázy pokoja a relaxu.'}
                        </p>

                        <div style={{
                            fontSize: '1rem',
                            fontWeight: 500,
                            marginBottom: 'auto'
                        }}>
                            Platnosť {pkg.validity_months ? `${pkg.validity_months} mesiac${pkg.validity_months === 1 ? '' : (pkg.validity_months >= 2 && pkg.validity_months <= 4 ? 'e' : 'ov')}` : 'neobmedzená'}
                        </div>
                    </div>

                    <div style={{
                        marginTop: '2rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        zIndex: 1,
                        position: 'relative'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                            <div style={{ marginBottom: '4px' }}>1 hodina ≈ {(pkg.price / pkg.credits).toFixed(2)} €</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white', lineHeight: 1 }}>
                                {pkg.price} €
                            </div>
                        </div>

                        <button
                            onClick={() => handleBuy(pkg.id)}
                            style={{
                                backgroundColor: '#F5F5F0', // Off-white
                                color: '#4A403A',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}
                        >
                            Zakúpiť
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
