'use client';

import { useState } from 'react';
import { buyVoucher } from '@/actions/voucher-actions';
import { updateProfile } from '@/app/dashboard/profile/actions';
import { Loader2 } from 'lucide-react';
import styles from './VoucherDashboard.module.css';
import { Button } from '@/components/ui/Button';

interface Product {
    id: string;
    title: string;
    description: string | null;
    credit_amount: number;
    price: number;
}

export function VoucherPurchaseForm({ products, userProfile }: { products: Product[], userProfile?: any }) {
    const [selectedProduct, setSelectedProduct] = useState<string>(products[0]?.id || '');
    const [isPending, setIsPending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Initial Voucher Form Data
    const [voucherData, setVoucherData] = useState({
        senderName: '',
        recipientEmail: '',
        message: ''
    });

    // Billing Form State
    const [showCheckout, setShowCheckout] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [billingErrors, setBillingErrors] = useState(false); // Visual error state
    const [billingData, setBillingData] = useState({
        full_name: userProfile?.full_name || '',
        phone: userProfile?.phone || '',
        billing_name: userProfile?.billing_name || userProfile?.full_name || '',
        billing_street: userProfile?.billing_street || '',
        billing_city: userProfile?.billing_city || '',
        billing_zip: userProfile?.billing_zip || '',
        billing_country: userProfile?.billing_country || 'Slovensko'
    });

    const handleVoucherDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setVoucherData({ ...voucherData, [e.target.name]: e.target.value });
    };

    const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBillingData({ ...billingData, [e.target.name]: e.target.value });
    };

    const handleInitialSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        // Validation for Step 1
        if (!voucherData.senderName || !voucherData.recipientEmail) {
            setMessage({ type: 'error', text: 'Vyplňte prosím meno a email.' });
            return;
        }
        setShowCheckout(true);
        setMessage(null);
    };

    async function handleFinalSubmit() {
        if (!termsAccepted || !privacyAccepted) {
            setBillingErrors(true);
            return;
        }
        if (!billingData.billing_name || !billingData.billing_street || !billingData.billing_city || !billingData.billing_zip) {
            alert('Prosím vyplňte všetky povinné fakturačné údaje.');
            return;
        }

        setIsPending(true);
        setMessage(null);

        try {
            // 1. Update Profile with Billing Info
            const profileFormData = new FormData();
            Object.entries(billingData).forEach(([key, value]) => {
                profileFormData.append(key, value);
            });
            await updateProfile(profileFormData);

            // 2. Buy Voucher
            const formData = new FormData();
            formData.append('productId', selectedProduct);
            formData.append('recipientEmail', voucherData.recipientEmail);
            formData.append('senderName', voucherData.senderName);
            formData.append('message', voucherData.message);

            const result = await buyVoucher(formData);

            if (result.success) {
                if (result.url) {
                    window.location.href = result.url;
                } else {
                    setMessage({ type: 'success', text: result.message || 'Success' });
                    setVoucherData({ senderName: '', recipientEmail: '', message: '' }); // Reset
                    setShowCheckout(false);
                }
            } else {
                setMessage({ type: 'error', text: result.message || 'Error' });
                setShowCheckout(false);
            }
        } catch (error) {
            console.error('Submission error:', error);
            setMessage({ type: 'error', text: 'Nastala chyba pri spracovaní.' });
            setShowCheckout(false);
        } finally {
            setIsPending(false);
        }
    }

    if (products.length === 0) {
        return <div className={styles.emptyState}>Momentálne nie sú dostupné žiadne darčekové poukazy.</div>;
    }

    const currentProduct = products.find(p => p.id === selectedProduct);

    return (
        <div className={styles.formCard}>
            <h2 className={styles.formTitle}>Vaša Objednávka</h2>

            <form onSubmit={(e) => e.preventDefault()}>
                {/* Product Selection */}
                <div className={styles.formGroup}>
                    <div className={styles.label}>Vyberte Voucher</div>
                    <div className={styles.productGrid}>
                        {products.map(product => (
                            <div
                                key={product.id}
                                onClick={() => setSelectedProduct(product.id)}
                                className={`${styles.productCard} ${selectedProduct === product.id ? styles.selected : ''}`}
                            >
                                <div className={styles.productInfo}>
                                    <h3>{product.title}</h3>
                                    <p>{product.description || `${product.credit_amount} vstupov`}</p>
                                </div>
                                <div className={styles.productPrice}>
                                    {product.price}€
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sender Name */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Vaše meno (Od koho)</label>
                    <input
                        required
                        name="senderName"
                        type="text"
                        placeholder="napr. Peter"
                        className={styles.input}
                        value={voucherData.senderName}
                        onChange={handleVoucherDataChange}
                    />
                </div>

                {/* Recipient Email */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Email obdarovaného (Komu)</label>
                    <input
                        required
                        name="recipientEmail"
                        type="email"
                        placeholder="email@priklad.sk"
                        className={styles.input}
                        value={voucherData.recipientEmail}
                        onChange={handleVoucherDataChange}
                    />
                </div>

                {/* Message */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Osobná správa (Voliteľné)</label>
                    <textarea
                        name="message"
                        rows={3}
                        placeholder="Všetko najlepšie k narodeninám..."
                        className={styles.textarea}
                        value={voucherData.message}
                        onChange={handleVoucherDataChange}
                    />
                </div>

                {message && (
                    <div className={`${styles.message} ${message.type === 'success' ? styles.success : styles.error}`}>
                        {message.text}
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleInitialSubmit}
                    disabled={isPending || !selectedProduct}
                    className={styles.submitButton}
                >
                    Pokračovať k platbe ({currentProduct?.price || 0}€)
                </button>
            </form>

            {/* CHECKOUT MODAL */}
            {showCheckout && currentProduct && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(3px)'
                }} onClick={() => { if (!isPending) setShowCheckout(false); }}>
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
                            <p style={{ fontWeight: '600', marginBottom: '0.2rem' }}>{currentProduct.title}</p>
                            <p style={{ color: '#666', fontSize: '0.9rem' }}>Cena: <span style={{ color: '#000' }}>{currentProduct.price} €</span></p>
                        </div>

                        {/* Invoice Data Form */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '1rem', marginBottom: '0.8rem', color: '#333' }}>Fakturačné a osobné údaje</h4>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.8rem' }}>Tieto údaje budú uložené vo vašom profile.</p>

                            <div style={{ display: 'grid', gap: '0.8rem' }}>
                                <input
                                    name="full_name" placeholder="Meno a priezvisko (Osoba)"
                                    value={billingData.full_name} onChange={handleBillingChange}
                                    style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem' }}
                                />
                                <input
                                    name="phone" placeholder="Telefón"
                                    value={billingData.phone} onChange={handleBillingChange}
                                    style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem' }}
                                />

                                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0.5rem 0' }} />

                                <input
                                    name="billing_name" placeholder="Fakturačné meno / Firma (Povinné)"
                                    value={billingData.billing_name} onChange={handleBillingChange}
                                    style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: billingData.billing_name ? 'white' : '#fff5f5' }}
                                />
                                <input
                                    name="billing_street" placeholder="Ulica a číslo (Povinné)"
                                    value={billingData.billing_street} onChange={handleBillingChange}
                                    style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: billingData.billing_street ? 'white' : '#fff5f5' }}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                    <input
                                        name="billing_city" placeholder="Mesto (Povinné)"
                                        value={billingData.billing_city} onChange={handleBillingChange}
                                        style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: billingData.billing_city ? 'white' : '#fff5f5' }}
                                    />
                                    <input
                                        name="billing_zip" placeholder="PSČ (Povinné)"
                                        value={billingData.billing_zip} onChange={handleBillingChange}
                                        style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: billingData.billing_zip ? 'white' : '#fff5f5' }}
                                    />
                                </div>
                                <input
                                    name="billing_country" placeholder="Štát"
                                    value={billingData.billing_country} onChange={handleBillingChange}
                                    style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem' }}
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
                                border: billingErrors && !termsAccepted ? '1px solid #ef4444' : '1px solid transparent',
                                backgroundColor: billingErrors && !termsAccepted ? '#fef2f2' : 'transparent',
                                transition: 'all 0.2s'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={e => {
                                        setTermsAccepted(e.target.checked);
                                        if (e.target.checked && privacyAccepted) setBillingErrors(false);
                                    }}
                                    style={{ marginTop: '3px' }}
                                />
                                <span style={{ color: billingErrors && !termsAccepted ? '#b91c1c' : 'inherit' }}>
                                    Súhlasím so <a href="/vop" target="_blank" style={{ textDecoration: 'underline', color: billingErrors && !termsAccepted ? '#b91c1c' : '#8C7568' }}>Všeobecnými obchodnými podmienkami (VOP)</a>
                                </span>
                            </label>

                            <label style={{
                                display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem', cursor: 'pointer',
                                padding: '10px', borderRadius: '6px',
                                border: billingErrors && !privacyAccepted ? '1px solid #ef4444' : '1px solid transparent',
                                backgroundColor: billingErrors && !privacyAccepted ? '#fef2f2' : 'transparent',
                                transition: 'all 0.2s'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={privacyAccepted}
                                    onChange={e => {
                                        setPrivacyAccepted(e.target.checked);
                                        if (e.target.checked && termsAccepted) setBillingErrors(false);
                                    }}
                                    style={{ marginTop: '3px' }}
                                />
                                <span style={{ color: billingErrors && !privacyAccepted ? '#b91c1c' : 'inherit' }}>
                                    Súhlasím so spracovaním osobných údajov <a href="/gdpr" target="_blank" style={{ textDecoration: 'underline', color: billingErrors && !privacyAccepted ? '#b91c1c' : '#8C7568' }}>(GDPR)</a>
                                </span>
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <Button
                                variant="outline"
                                onClick={() => setShowCheckout(false)}
                                disabled={isPending}
                            >
                                Zrušiť
                            </Button>
                            <Button
                                onClick={handleFinalSubmit}
                                disabled={isPending}
                                style={{ minWidth: '140px', justifyContent: 'center' }}
                            >
                                {isPending ? <Loader2 className="animate-spin" size={16} /> : 'Zaplatiť'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
