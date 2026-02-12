'use client';

import clsx from 'clsx';
import { useVerification } from '@/components/auth/VerificationContext';
import { Button } from '@/components/ui/Button';
import styles from './CreditPackages.module.css';
import { createCheckoutSession } from '@/app/actions/stripe';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { updateProfile } from '@/app/dashboard/profile/actions';

// Define the type matching DB structure
export interface CreditPackage {
    id: string;
    title: string;
    price: number; // in Euros
    credits: number;
    bonus_credits: number;
    description: string | null;
    validity_months: number | null;
    is_active: boolean;
    is_popular: boolean;
}

interface CreditPackagesProps {
    userProfile?: any;
    packages?: CreditPackage[]; // Make optional to prevent breakage if not passed immediately
}

const formatMonths = (count: number) => {
    if (count === 1) return '1 mesiac';
    if (count >= 2 && count <= 4) return `${count} mesiace`;
    return `${count} mesiacov`;
};

const formatPriceDetail = (price: number, credits: number) => {
    if (credits === 1) return `1 hodina - ${price.toFixed(2)} €`;
    return `${(price / credits).toFixed(2)} € / vstup`;
};

export function CreditPackages({ userProfile, packages = [] }: CreditPackagesProps) {
    const { isVerified } = useVerification();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    // State for the compliance modal
    const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [showErrors, setShowErrors] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        billing_name: '',
        billing_street: '',
        billing_city: '',
        billing_zip: '',
        billing_country: 'Slovensko'
    });

    // Initial click handler - opens modal
    const handleInitialClick = (pkg: CreditPackage) => {
        // Pre-fill form
        setFormData({
            full_name: userProfile?.full_name || '',
            phone: userProfile?.phone || '',
            billing_name: userProfile?.billing_name || userProfile?.full_name || '',
            billing_street: userProfile?.billing_street || '',
            billing_city: userProfile?.billing_city || '',
            billing_zip: userProfile?.billing_zip || '',
            billing_country: userProfile?.billing_country || 'Slovensko'
        });

        setSelectedPackage(pkg);
        setTermsAccepted(false);
        setPrivacyAccepted(false);
        setShowErrors(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Confirm handler - proceeds to Stripe
    const handleConfirmBuy = async () => {
        if (!selectedPackage) return;

        // Visual validation
        if (!termsAccepted || !privacyAccepted) {
            setShowErrors(true);
            return;
        }

        // Basic validation
        if (!formData.full_name || !formData.billing_street || !formData.billing_city || !formData.billing_zip || !formData.billing_country) {
            alert('Prosím vyplňte všetky povinné fakturačné údaje (vrátane štátu).');
            return;
        }

        try {
            setLoadingId(selectedPackage.id);

            // 1. Update Profile First
            const profileData = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                // If billing_name is empty, use full_name
                if (key === 'billing_name' && !value) {
                    profileData.append(key, formData.full_name);
                } else {
                    profileData.append(key, value);
                }
            });

            // We assume user is logged in
            await updateProfile(profileData);

            // 2. Create Checkout Session
            const result = await createCheckoutSession(
                selectedPackage.id
            ) as any;

            if (result && result.error) {
                alert(`Chyba: ${result.error}`);
                setLoadingId(null);
                return;
            }

            if (result && result.url) {
                window.location.href = result.url;
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Nastala chyba pri vytváraní objednávky.');
            setLoadingId(null);
        }
    };

    return (
        <div className={styles.container}>
            <p className={styles.description}>
                Zvoľte si balíček, ktorý najviac vyhovuje vašim potrebám. Po zakúpení sa vstupy automaticky pripočítajú na váš účet a môžete ich ihneď využiť na rezerváciu termínov.
            </p>
            <div className={styles.grid}>
                {packages.map((pkg) => (
                    <div key={pkg.id} className={clsx(styles.card, { [styles.highlightCard]: pkg.is_popular })}>
                        {pkg.is_popular && <div className={styles.badge}>Doporučujeme</div>}

                        <div>
                            <div className={styles.cardHeader}>
                                <h4 className={styles.cardTitle}>{pkg.title}</h4>
                            </div>

                            <div className={styles.metaRow}>
                                <span className={styles.creditsCount}>
                                    Počet vstupov: <strong>{pkg.credits}</strong>
                                    {pkg.bonus_credits > 0 && <span style={{ fontSize: '0.8em', marginLeft: '5px', color: '#a7f3d0' }}>+{pkg.bonus_credits}</span>}
                                </span>
                                <span className={styles.validity}>
                                    Platnosť: <strong>{pkg.validity_months ? formatMonths(pkg.validity_months) : 'Neobmedzená'}</strong>
                                </span>
                            </div>

                            <p className={styles.cardDesc}>{pkg.description}</p>
                        </div>

                        <div className={styles.cardFooter}>
                            <div className={styles.priceContainer}>
                                {pkg.title !== 'Oasis Unlimited Movement Pass' && (
                                    <span className={styles.priceDetail}>
                                        {formatPriceDetail(pkg.price, pkg.credits)}
                                    </span>
                                )}
                                <span className={styles.price}>{pkg.price} €</span>
                            </div>
                            <Button
                                className={clsx(styles.buyButton, {
                                    'opacity-50 cursor-not-allowed': !isVerified
                                })}
                                onClick={() => handleInitialClick(pkg)}
                                disabled={loadingId !== null || !isVerified}
                                title={!isVerified ? "Pre nákup musíte mať overený email" : ""}
                            >
                                {loadingId === pkg.id ? 'SPRACOVÁVA SA...' : (!isVerified ? 'Overte Email' : 'Zakúpiť')}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Compliance Modal */}
            {selectedPackage && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(3px)'
                }} onClick={() => { if (!loadingId) setSelectedPackage(null); }}>
                    <div style={{
                        backgroundColor: 'white', padding: '2rem', borderRadius: '12px',
                        width: '90%', maxWidth: '500px',
                        maxHeight: '90vh', overflowY: 'auto',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontFamily: 'serif', fontSize: '1.4rem', marginBottom: '1rem', color: '#4A403A' }}>
                            Dokončenie objednávky
                        </h3>

                        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                            <p style={{ fontWeight: '600', marginBottom: '0.2rem' }}>{selectedPackage.title}</p>
                            <p style={{ color: '#666', fontSize: '0.9rem' }}>Cena: <span style={{ color: '#000' }}>{selectedPackage.price} € s DPH</span></p>
                        </div>

                        {/* Invoice Data Form */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '1rem', marginBottom: '0.8rem', color: '#333' }}>Fakturačné a osobné údaje</h4>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.8rem' }}>Tieto údaje budú uložené vo vašom profile.</p>

                            <div style={{ display: 'grid', gap: '0.8rem' }}>
                                <input
                                    name="full_name" placeholder="Meno a priezvisko (Povinné)"
                                    value={formData.full_name} onChange={handleInputChange}
                                    style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: formData.full_name ? 'white' : '#fff5f5' }}
                                />

                                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0.5rem 0' }} />

                                {/* Billing Name hidden - using Full Name */}
                                {/* <input
                                    name="billing_name" placeholder="Fakturačné meno / Firma (Voliteľné)"
                                    value={formData.billing_name} onChange={handleInputChange}
                                    style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: formData.billing_name ? 'white' : '#fff5f5' }}
                                /> */}
                                <input
                                    name="billing_street" placeholder="Ulica a číslo (Povinné)"
                                    value={formData.billing_street} onChange={handleInputChange}
                                    style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: formData.billing_street ? 'white' : '#fff5f5' }}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                    <input
                                        name="billing_city" placeholder="Mesto (Povinné)"
                                        value={formData.billing_city} onChange={handleInputChange}
                                        style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: formData.billing_city ? 'white' : '#fff5f5' }}
                                    />
                                    <input
                                        name="billing_zip" placeholder="PSČ (Povinné)"
                                        value={formData.billing_zip} onChange={handleInputChange}
                                        style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: formData.billing_zip ? 'white' : '#fff5f5' }}
                                    />
                                </div>
                                <input
                                    name="billing_country" placeholder="Štát (Povinné)"
                                    value={formData.billing_country} onChange={handleInputChange}
                                    style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: formData.billing_country ? 'white' : '#fff5f5' }}
                                />
                            </div>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
                            Pred pokračovaním je potrebné odsúhlasiť podmienky:
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                            <label style={{
                                display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem', cursor: 'pointer',
                                padding: '10px', borderRadius: '6px',
                                border: showErrors && !termsAccepted ? '1px solid #ef4444' : '1px solid transparent',
                                backgroundColor: showErrors && !termsAccepted ? '#fef2f2' : 'transparent',
                                transition: 'all 0.2s'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={e => {
                                        setTermsAccepted(e.target.checked);
                                        if (e.target.checked && privacyAccepted) setShowErrors(false);
                                    }}
                                    style={{ marginTop: '3px' }}
                                />
                                <span style={{ color: showErrors && !termsAccepted ? '#b91c1c' : 'inherit' }}>
                                    Súhlasím so <a href="https://www.oasislounge.sk/vseobecne-obchodne-podmienky/" target="_blank" style={{ textDecoration: 'underline', color: showErrors && !termsAccepted ? '#b91c1c' : '#8C7568' }}>Všeobecnými obchodnými podmienkami (VOP)</a>
                                </span>
                            </label>

                            <label style={{
                                display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem', cursor: 'pointer',
                                padding: '10px', borderRadius: '6px',
                                border: showErrors && !privacyAccepted ? '1px solid #ef4444' : '1px solid transparent',
                                backgroundColor: showErrors && !privacyAccepted ? '#fef2f2' : 'transparent',
                                transition: 'all 0.2s'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={privacyAccepted}
                                    onChange={e => {
                                        setPrivacyAccepted(e.target.checked);
                                        if (e.target.checked && termsAccepted) setShowErrors(false);
                                    }}
                                    style={{ marginTop: '3px' }}
                                />
                                <span style={{ color: showErrors && !privacyAccepted ? '#b91c1c' : 'inherit' }}>
                                    Súhlasím so spracovaním osobných údajov <a href="https://www.oasislounge.sk/ochrana-osobnych-udajov/" target="_blank" style={{ textDecoration: 'underline', color: showErrors && !privacyAccepted ? '#b91c1c' : '#8C7568' }}>(GDPR)</a>
                                </span>
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <Button
                                variant="outline"
                                onClick={() => setSelectedPackage(null)}
                                disabled={loadingId !== null}
                            >
                                Zrušiť
                            </Button>
                            <Button
                                onClick={handleConfirmBuy}
                                disabled={loadingId !== null}
                                style={{ minWidth: '140px', justifyContent: 'center' }}
                            >
                                {loadingId ? <Loader2 className="animate-spin" size={16} /> : 'Pokračovať k platbe'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
