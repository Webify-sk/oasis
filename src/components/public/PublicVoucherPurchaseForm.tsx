'use client';

import { useState } from 'react';
import { buyVoucher } from '@/actions/voucher-actions';
import { Loader2, ArrowLeft } from 'lucide-react';
import styles from './PublicVoucher.module.css';
import { Button } from '@/components/ui/Button';

interface Product {
    id: string;
    title: string;
    description: string | null;
    credit_amount: number;
    price: number;
    category?: string | null;
}

interface PublicVoucherPurchaseFormProps {
    product: Product;
    onBack: () => void;
}

export function PublicVoucherPurchaseForm({ product, onBack }: PublicVoucherPurchaseFormProps) {
    const [isPending, setIsPending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Initial Voucher Form Data
    const [voucherData, setVoucherData] = useState({
        senderName: '',
        recipientEmail: '',
        message: ''
    });

    // Billing Form State
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [billingErrors, setBillingErrors] = useState(false);
    const [billingData, setBillingData] = useState({
        full_name: '',
        phone: '',
        billing_name: '',
        billing_street: '',
        billing_city: '',
        billing_zip: '',
        billing_country: 'Slovensko',
        customer_email: '', // Crucial for guest checkout
        company_name: '',
        company_ico: '',
        company_dic: '',
        company_ic_dph: ''
    });

    const [isCompany, setIsCompany] = useState(false);

    const handleVoucherDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setVoucherData({ ...voucherData, [e.target.name]: e.target.value });
    };

    const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBillingData({ ...billingData, [e.target.name]: e.target.value });
    };

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();

        // 1. Validation
        if (!termsAccepted || !privacyAccepted) {
            setBillingErrors(true);
            setMessage({ type: 'error', text: 'Prosím, odsúhlaste podmienky.' });
            return;
        }

        if (!billingData.customer_email) {
            setMessage({ type: 'error', text: 'Prosím, zadajte váš email pre potvrdenie objednávky.' });
            return;
        }

        setIsPending(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append('productId', product.id);
            formData.append('isGuest', 'true');

            // Voucher Info
            formData.append('senderName', voucherData.senderName);
            formData.append('recipientEmail', voucherData.recipientEmail);
            formData.append('message', voucherData.message);

            // Billing Info
            formData.append('full_name', billingData.full_name);
            formData.append('phone', billingData.phone);
            formData.append('customer_email', billingData.customer_email);
            formData.append('billing_name', billingData.billing_name || billingData.full_name);
            formData.append('billing_street', billingData.billing_street);
            formData.append('billing_city', billingData.billing_city);
            formData.append('billing_zip', billingData.billing_zip);
            formData.append('billing_country', billingData.billing_country);

            if (isCompany) {
                formData.append('company_name', billingData.company_name);
                formData.append('company_ico', billingData.company_ico);
                formData.append('company_dic', billingData.company_dic);
                formData.append('company_ic_dph', billingData.company_ic_dph);
            }

            const result = await buyVoucher(formData);

            if (result.success) {
                if (result.url) {
                    // Redirect TOP window to Stripe
                    window.top!.location.href = result.url;
                } else {
                    setMessage({ type: 'success', text: result.message || 'Success' });
                }
            } else {
                setMessage({ type: 'error', text: result.message || 'Error' });
            }
        } catch (error) {
            console.error('Submission error:', error);
            setMessage({ type: 'error', text: 'Nastala chyba pri spracovaní.' });
        } finally {
            setIsPending(false);
        }
    }

    return (
        <div className={styles.formCard}>
            <button onClick={onBack} className={styles.backButton}>
                <ArrowLeft size={16} /> Späť na výber
            </button>

            <h2 className={styles.formTitle}>Objednávka</h2>

            <div className={styles.productSummary}>
                <h3 className={styles.productSummaryTitle}>{product.title}</h3>
                <div className={styles.productSummaryPrice}>{product.price} €</div>
                {product.description && <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>{product.description}</p>}
            </div>

            <form onSubmit={handleSubmit}>
                {/* 1. Voucher Details */}
                <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Údaje na poukaz</h4>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Vaše meno (Od koho) *</label>
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

                <div className={styles.formGroup}>
                    <label className={styles.label}>Email obdarovaného (Komu príde poukaz) *</label>
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

                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '2rem 0' }} />

                {/* 2. Billing Details */}
                <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Fakturačné údaje (Kupujúci)</h4>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Váš Email (Pre potvrdenie objednávky) *</label>
                    <input
                        required
                        name="customer_email"
                        type="email"
                        placeholder="vas@email.sk"
                        className={styles.input}
                        value={billingData.customer_email}
                        onChange={handleBillingChange}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Meno a priezvisko *</label>
                    <input
                        required
                        name="full_name"
                        type="text"
                        className={styles.input}
                        value={billingData.full_name}
                        onChange={handleBillingChange}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Telefón</label>
                    <input
                        name="phone"
                        type="tel"
                        className={styles.input}
                        value={billingData.phone}
                        onChange={handleBillingChange}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Ulica a číslo *</label>
                    <input
                        required
                        name="billing_street"
                        type="text"
                        className={styles.input}
                        value={billingData.billing_street}
                        onChange={handleBillingChange}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Mesto *</label>
                        <input
                            required
                            name="billing_city"
                            type="text"
                            className={styles.input}
                            value={billingData.billing_city}
                            onChange={handleBillingChange}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>PSČ *</label>
                        <input
                            required
                            name="billing_zip"
                            type="text"
                            className={styles.input}
                            value={billingData.billing_zip}
                            onChange={handleBillingChange}
                        />
                    </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#4b5563' }}>
                    <input
                        type="checkbox"
                        checked={isCompany}
                        onChange={(e) => setIsCompany(e.target.checked)}
                    />
                    Nakupovať na firmu
                </label>

                {isCompany && (
                    <div style={{ display: 'grid', gap: '0.8rem', padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1.5rem' }}>
                        <h5 style={{ margin: 0, fontSize: '0.9rem', color: '#334155' }}>Firemné údaje</h5>
                        <input
                            name="company_name" placeholder="Názov spoločnosti (Povinné pre firmu)"
                            value={billingData.company_name} onChange={handleBillingChange}
                            style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: billingData.company_name ? 'white' : '#fff5f5' }}
                        />
                        <input
                            name="company_ico" placeholder="IČO (Povinné pre firmu)"
                            value={billingData.company_ico} onChange={handleBillingChange}
                            style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem', backgroundColor: billingData.company_ico ? 'white' : '#fff5f5' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                            <input
                                name="company_dic" placeholder="DIČ"
                                value={billingData.company_dic} onChange={handleBillingChange}
                                style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem' }}
                            />
                            <input
                                name="company_ic_dph" placeholder="IČ DPH"
                                value={billingData.company_ic_dph} onChange={handleBillingChange}
                                style={{ padding: '0.7rem', border: '1px solid #ddd', borderRadius: '6px', width: '100%', fontSize: '0.9rem' }}
                            />
                        </div>
                    </div>
                )}

                {/* Terms */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                    <label className={styles.checkboxLabel} style={{
                        backgroundColor: billingErrors && !termsAccepted ? '#fef2f2' : 'transparent',
                    }}>
                        <input
                            type="checkbox"
                            className={styles.checkboxInput}
                            checked={termsAccepted}
                            onChange={e => {
                                setTermsAccepted(e.target.checked);
                                if (e.target.checked && privacyAccepted) setBillingErrors(false);
                            }}
                        />
                        <span style={{ color: billingErrors && !termsAccepted ? '#b91c1c' : 'inherit' }}>
                            Súhlasím so <a href="https://www.oasislounge.sk/vseobecne-obchodne-podmienky/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: billingErrors && !termsAccepted ? '#b91c1c' : '#5E715D' }}>VOP</a>
                        </span>
                    </label>

                    <label className={styles.checkboxLabel} style={{
                        backgroundColor: billingErrors && !privacyAccepted ? '#fef2f2' : 'transparent',
                    }}>
                        <input
                            type="checkbox"
                            className={styles.checkboxInput}
                            checked={privacyAccepted}
                            onChange={e => {
                                setPrivacyAccepted(e.target.checked);
                                if (e.target.checked && termsAccepted) setBillingErrors(false);
                            }}
                        />
                        <span style={{ color: billingErrors && !privacyAccepted ? '#b91c1c' : 'inherit' }}>
                            Súhlasím so spracovaním <a href="https://www.oasislounge.sk/ochrana-osobnych-udajov/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: billingErrors && !privacyAccepted ? '#b91c1c' : '#5E715D' }}>osobných údajov (GDPR)</a>
                        </span>
                    </label>
                </div>

                {message && (
                    <div className={`${styles.message} ${message.type === 'success' ? styles.success : styles.error}`}>
                        {message.text}
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={isPending}
                    className={styles.submitButton}
                >
                    {isPending ? <Loader2 className="animate-spin" size={16} /> : `Zaplatiť ${product.price} €`}
                </Button>
            </form>
        </div>
    );
}
