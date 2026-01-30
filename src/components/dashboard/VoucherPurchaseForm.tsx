'use client';

import { useState } from 'react';
import { buyVoucher } from '@/actions/voucher-actions';
import { Loader2 } from 'lucide-react';
import styles from './VoucherDashboard.module.css';

interface Product {
    id: string;
    title: string;
    description: string | null;
    credit_amount: number;
    price: number;
}

export function VoucherPurchaseForm({ products }: { products: Product[] }) {
    const [selectedProduct, setSelectedProduct] = useState<string>(products[0]?.id || '');
    const [isPending, setIsPending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        setMessage(null);

        try {
            const result = await buyVoucher(formData);
            if (result.success) {
                if (result.url) {
                    // Redirect to Stripe
                    window.location.href = result.url;
                } else {
                    setMessage({ type: 'success', text: result.message || 'Success' });
                    (document.getElementById('purchaseForm') as HTMLFormElement).reset();
                }
            } else {
                setMessage({ type: 'error', text: result.message || 'Error' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Nastala chyba pri spracovaní.' });
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

            <form id="purchaseForm" action={handleSubmit}>
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
                    <input type="hidden" name="productId" value={selectedProduct} />
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
                    />
                </div>

                {message && (
                    <div className={`${styles.message} ${message.type === 'success' ? styles.success : styles.error}`}>
                        {message.text}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending || !selectedProduct}
                    className={styles.submitButton}
                >
                    {isPending && <Loader2 className="animate-spin" size={20} />}
                    {isPending ? 'Spracovávam...' : `Zaplatiť ${currentProduct?.price || 0}€`}
                </button>
            </form>
        </div>
    );
}
