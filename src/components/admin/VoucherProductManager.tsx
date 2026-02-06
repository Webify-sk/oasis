'use client';

import { useState } from 'react';
import { createVoucherProduct } from '@/actions/voucher-actions';
import { Loader2, Plus, Tag, Euro, CreditCard, FileText, Gift } from 'lucide-react';
import styles from './VoucherAdmin.module.css';

export function VoucherProductManager() {
    const [isPending, setIsPending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<string>('Training');

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        setMessage(null);

        try {
            const result = await createVoucherProduct(formData);
            if (result.success) {
                setMessage({ type: 'success', text: result.message || 'Produkt úspešne vytvorený' });
                (document.getElementById('createParamsForm') as HTMLFormElement).reset();
            } else {
                setMessage({ type: 'error', text: result.message || 'Chyba pri vytváraní' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Chyba servera.' });
        } finally {
            setIsPending(false);
        }
    }

    return (
        <div className={styles.formCard}>
            <div className={styles.cardHeader}>
                <Gift size={20} color="#3b82f6" />
                <h2 className={styles.cardTitle}>Nový Poukaz</h2>
            </div>

            <div className={styles.formContent}>
                <form id="createParamsForm" action={handleSubmit} className={styles.grid}>
                    {/* Title */}
                    <div>
                        <label className={styles.label}>
                            <Tag size={12} />
                            Názov Produktu
                        </label>
                        <input
                            name="title"
                            required
                            className={styles.input}
                            placeholder="napr. Vianočný Balíček"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className={styles.label}>
                            <Tag size={12} />
                            Kategória
                        </label>
                        <select
                            name="category"
                            defaultValue="Training"
                            className={styles.input}
                            style={{ height: '42px', backgroundColor: 'white' }}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="Training">Tréningy</option>
                            <option value="Beauty">Beauty</option>
                        </select>
                    </div>

                    {/* Price */}
                    <div>
                        <label className={styles.label}>
                            <Euro size={12} />
                            Cena (€)
                        </label>
                        <input
                            name="price"
                            type="number"
                            step="0.01"
                            required
                            className={styles.input}
                            placeholder="0.00"
                        />
                    </div>

                    {/* Credits - Only for Training */}
                    {selectedCategory === 'Training' ? (
                        <div>
                            <label className={styles.label}>
                                <CreditCard size={12} />
                                Počet Vstupov
                            </label>
                            <input
                                name="credits"
                                type="number"
                                required
                                className={styles.input}
                                placeholder="0"
                            />
                        </div>
                    ) : (
                        <input type="hidden" name="credits" value="0" />
                    )}

                    {/* Description */}
                    <div className={styles.fullWidth}>
                        <label className={styles.label}>
                            <FileText size={12} />
                            Popis
                        </label>
                        <textarea
                            name="description"
                            className={styles.textarea}
                            rows={3}
                            placeholder="Stručný popis pre zákazníka..."
                        ></textarea>
                    </div>

                    {/* Submit & Message */}
                    <div className={styles.buttonRow}>
                        {message ? (
                            <div className={`${styles.message} ${message.type === 'success' ? styles.success : styles.error}`}>
                                {message.text}
                            </div>
                        ) : <div></div>}

                        <button
                            type="submit"
                            disabled={isPending}
                            className={styles.submitButton}
                        >
                            {isPending ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                            Vytvoriť Produkt
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
