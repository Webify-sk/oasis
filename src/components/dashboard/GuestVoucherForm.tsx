'use client';

import { useState, useEffect } from 'react';
import { buyVoucher } from '@/actions/voucher-actions';
import { Loader2 } from 'lucide-react';
import styles from '@/components/dashboard/VoucherDashboard.module.css'; // Reusing styles
import { Button } from '@/components/ui/Button';

interface Product {
    id: string;
    title: string;
    description: string | null;
    credit_amount: number;
    price: number;
    category?: string;
}

export function GuestVoucherForm({ products, preselectedId }: { products: Product[], preselectedId?: string }) {
    const [selectedProduct, setSelectedProduct] = useState<string>(preselectedId || '');
    const [activeCategory, setActiveCategory] = useState<'Training' | 'Beauty'>('Training');

    // Filter products based on active category
    // Treat 'Gift' or null as 'Training' for backward compatibility
    const filteredProducts = products.filter(p => {
        const cat = p.category || 'Training';
        if (activeCategory === 'Training') {
            return cat === 'Training' || cat === 'Gift';
        }
        return cat === 'Beauty';
    });

    // Auto-select first product when category changes if current selection is not in new category
    useEffect(() => {
        if (selectedProduct) {
            const product = products.find(p => p.id === selectedProduct);
            if (product) {
                const productCat = (product.category === 'Gift' || !product.category) ? 'Training' : product.category;
                if (productCat !== activeCategory) {
                    // Current selection not in active category? Switch category or clear selection?
                    // Let's switch category to match selection if it was explicit (e.g. preselectedId)
                    // But if user clicks tab, we should clear selection or pick first.
                }
            }
        }
    }, [selectedProduct, products]); // Logic slightly tricky.

    // Better: Effect when filteredProducts changes, ensure selection is valid? 
    // Or just let user select.
    // If user switches tab, we probably want to select the first option of that tab.
    useEffect(() => {
        if (!filteredProducts.some(p => p.id === selectedProduct)) {
            if (filteredProducts.length > 0) {
                setSelectedProduct(filteredProducts[0].id);
            } else {
                setSelectedProduct('');
            }
        }
    }, [activeCategory, filteredProducts]); // selectedProduct dependency removed to avoid loops

    // Sync state if prop changes (e.g. navigation)
    useEffect(() => {
        if (preselectedId && products.some(p => p.id === preselectedId)) {
            setSelectedProduct(preselectedId);
            const p = products.find(p => p.id === preselectedId);
            if (p) {
                const cat = (p.category === 'Gift' || !p.category) ? 'Training' : p.category;
                if (cat === 'Beauty' || cat === 'Training') {
                    setActiveCategory(cat as 'Training' | 'Beauty');
                }
            }
        }
    }, [preselectedId, products]);

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
    const [billingErrors, setBillingErrors] = useState(false);
    const [billingData, setBillingData] = useState({
        full_name: '', // Purchaser name
        phone: '',
        billing_name: '',
        billing_street: '',
        billing_city: '',
        billing_zip: '',
        billing_country: 'Slovensko',
        customer_email: '' // Crucial for guest
    });

    const handleVoucherDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setVoucherData({ ...voucherData, [e.target.name]: e.target.value });
    };

    const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBillingData({ ...billingData, [e.target.name]: e.target.value });
    };

    const handleInitialSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!voucherData.senderName || !voucherData.recipientEmail) {
            setMessage({ type: 'error', text: 'Vyplňte prosím meno a email.' });
            return;
        }
        setShowCheckout(true);
        setMessage(null);
    };

    const [modalError, setModalError] = useState<string | null>(null);

    async function handleFinalSubmit() {
        setModalError(null);
        if (!termsAccepted || !privacyAccepted) {
            setBillingErrors(true);
            setModalError('Prosím, odsúhlaste podmienky a spracovanie údajov.');
            return;
        }

        const required = [
            billingData.full_name,
            billingData.customer_email,
            billingData.billing_street,
            billingData.billing_city,
            billingData.billing_zip,
            billingData.billing_country
        ];

        if (required.some(field => !field || field.trim() === '')) {
            setBillingErrors(true); // Re-use this to highlight fields
            setModalError('Všetky kontaktné a fakturačné údaje (Meno, Email, Adresa, Štát) sú povinné.');
            return;
        }

        setIsPending(true);
        setMessage(null);

        try {
            // No profile update here (Guest Mode)

            const formData = new FormData();
            formData.append('productId', selectedProduct);
            formData.append('recipientEmail', voucherData.recipientEmail);
            formData.append('senderName', voucherData.senderName);
            formData.append('message', voucherData.message);

            Object.entries(billingData).forEach(([key, value]) => {
                if (key === 'billing_name' && !value) {
                    formData.append(key, billingData.full_name);
                } else {
                    formData.append(key, value);
                }
            });
            formData.append('isGuest', 'true');


            const result = await buyVoucher(formData);

            if (result.success) {
                if (result.url) {
                    window.location.href = result.url;
                } else {
                    setMessage({ type: 'success', text: result.message || 'Success' });
                    setVoucherData({ senderName: '', recipientEmail: '', message: '' });
                    setShowCheckout(false);
                }
            } else {
                setModalError(result.message || 'Nastala chyba pri spracovaní.');
                // Don't close modal on error so user can fix it
            }
        } catch (error) {
            console.error('Submission error:', error);
            setModalError('Nastala neočakávaná chyba. Skúste to prosím neskôr.');
        } finally {
            setIsPending(false);
        }
    }

    // if (products.length === 0) {
    //     return <div className={styles.emptyState}>Momentálne nie sú dostupné žiadne darčekové poukazy.</div>;
    // }

    const currentProduct = products.find(p => p.id === selectedProduct);

    return (
        <div className={styles.formCard}>
            <h2 className={styles.formTitle}>Vaša Objednávka</h2>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <button
                    onClick={() => setActiveCategory('Training')}
                    style={{
                        padding: '0.6rem 1.5rem',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: activeCategory === 'Training' ? '#5E715D' : '#ddd',
                        backgroundColor: activeCategory === 'Training' ? '#5E715D' : 'transparent',
                        color: activeCategory === 'Training' ? 'white' : '#666',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    Tréningy
                </button>
                <button
                    onClick={() => setActiveCategory('Beauty')}
                    style={{
                        padding: '0.6rem 1.5rem',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: activeCategory === 'Beauty' ? '#5E715D' : '#ddd',
                        backgroundColor: activeCategory === 'Beauty' ? '#5E715D' : 'transparent',
                        color: activeCategory === 'Beauty' ? 'white' : '#666',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    Beauty
                </button>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
                {/* Product Selection */}
                <div className={styles.formGroup}>
                    <div className={styles.label}>
                        {activeCategory === 'Training' ? 'Vyberte balík vstupov' : 'Vyberte beauty voucher'}
                    </div>

                    {filteredProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#888', fontStyle: 'italic', border: '1px dashed #ddd', borderRadius: '8px' }}>
                            V tejto kategórii zatiaľ nie sú žiadne vouchery.
                        </div>
                    ) : (
                        <div className={styles.productGrid}>
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => setSelectedProduct(product.id)}
                                    className={`${styles.productCard} ${selectedProduct === product.id ? styles.selected : ''}`}
                                >
                                    <div className={styles.productInfo}>
                                        <h3>{product.title}</h3>
                                        <p>
                                            {product.description || (
                                                activeCategory === 'Beauty' ? 'Darčekový poukaz' : `${product.credit_amount} vstupov`
                                            )}
                                        </p>
                                    </div>
                                    <div className={styles.productPrice}>
                                        {product.price}€
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
                            <p style={{ color: '#666', fontSize: '0.9rem' }}>Cena: <span style={{ color: '#000' }}>{currentProduct.price} € s DPH</span></p>
                        </div>

                        {/* Error Notification */}
                        {modalError && (
                            <div style={{
                                backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B',
                                padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.9rem'
                            }}>
                                ⚠️ {modalError}
                            </div>
                        )}

                        {/* Invoice Data Form */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '1rem', marginBottom: '0.8rem', color: '#333' }}>Fakturačné a kontaktné údaje <span style={{ color: '#ef4444' }}>*</span></h4>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.8rem' }}>Kam máme zaslať potvrdenie a faktúru?</p>

                            <div style={{ display: 'grid', gap: '0.8rem' }}>
                                <input
                                    name="customer_email" type="email" placeholder="Váš Email (Pre potvrdenie) *"
                                    value={billingData.customer_email} onChange={handleBillingChange}
                                    style={{
                                        padding: '0.7rem', border: billingErrors && !billingData.customer_email ? '1px solid #ef4444' : '1px solid #ddd',
                                        borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: billingData.customer_email ? 'white' : '#fff5f5'
                                    }}
                                />
                                <input
                                    name="full_name" placeholder="Vaše Meno a priezvisko *"
                                    value={billingData.full_name} onChange={handleBillingChange}
                                    style={{
                                        padding: '0.7rem', border: billingErrors && !billingData.full_name ? '1px solid #ef4444' : '1px solid #ddd',
                                        borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: billingData.full_name ? 'white' : '#fff5f5'
                                    }}
                                />
                                <input
                                    name="phone" placeholder="Telefón *"
                                    value={billingData.phone} onChange={handleBillingChange}
                                    style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem' }}
                                />

                                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0.5rem 0' }} />

                                <p style={{ fontSize: '0.85rem', color: '#666' }}>Údaje na faktúru:</p>

                                {/* Billing Name hidden - using Full Name */}
                                {/* <input
                                    name="billing_name" placeholder="Fakturačné meno / Firma (Voliteľné)"
                                    value={billingData.billing_name} onChange={handleBillingChange}
                                    style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem' }}
                                /> */}

                                <input
                                    name="billing_street" placeholder="Ulica a číslo *"
                                    value={billingData.billing_street} onChange={handleBillingChange}
                                    style={{
                                        padding: '0.7rem', border: billingErrors && !billingData.billing_street ? '1px solid #ef4444' : '1px solid #ddd',
                                        borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: billingData.billing_street ? 'white' : '#fff5f5'
                                    }}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                    <input
                                        name="billing_city" placeholder="Mesto *"
                                        value={billingData.billing_city} onChange={handleBillingChange}
                                        style={{
                                            padding: '0.7rem', border: billingErrors && !billingData.billing_city ? '1px solid #ef4444' : '1px solid #ddd',
                                            borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: billingData.billing_city ? 'white' : '#fff5f5'
                                        }}
                                    />
                                    <input
                                        name="billing_zip" placeholder="PSČ *"
                                        value={billingData.billing_zip} onChange={handleBillingChange}
                                        style={{
                                            padding: '0.7rem', border: billingErrors && !billingData.billing_zip ? '1px solid #ef4444' : '1px solid #ddd',
                                            borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: billingData.billing_zip ? 'white' : '#fff5f5'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

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
                                    Súhlasím so <a href="https://www.oasislounge.sk/vseobecne-obchodne-podmienky/" target="_blank" style={{ textDecoration: 'underline', color: billingErrors && !termsAccepted ? '#b91c1c' : '#8C7568' }}>Všeobecnými obchodnými podmienkami (VOP)</a>
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
                                    Súhlasím so spracovaním osobných údajov <a href="https://www.oasislounge.sk/ochrana-osobnych-udajov/" target="_blank" style={{ textDecoration: 'underline', color: billingErrors && !privacyAccepted ? '#b91c1c' : '#8C7568' }}>(GDPR)</a>
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
