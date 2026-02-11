'use client';

import { useState } from 'react';
import { Pencil, Trash2, X, Save, Loader2 } from 'lucide-react';
import { deleteVoucherProduct, updateVoucherProduct } from '@/actions/voucher-actions';
import { useRouter } from 'next/navigation';
import styles from './VoucherAdmin.module.css';

interface VoucherProduct {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    price: number;
    credit_amount: number;
    is_active: boolean;
}

export function VoucherListActions({ product }: { product: VoucherProduct }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Naozaj chcete zmazať tento produkt?')) return;
        setIsDeleting(true);
        const res = await deleteVoucherProduct(product.id);
        setIsDeleting(false);
        if (res.success) {
            router.refresh();
        } else {
            alert(res.message);
        }
    };

    const handleUpdate = async (formData: FormData) => {
        setIsSaving(true);
        const res = await updateVoucherProduct(formData);
        setIsSaving(false);
        if (res.success) {
            setIsEditing(false);
            router.refresh();
        } else {
            alert(res.message);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-gray-100 rounded-full text-blue-600 transition-colors"
                title="Upraviť"
            >
                <Pencil size={18} />
            </button>
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 hover:bg-red-50 rounded-full text-red-600 transition-colors"
                title="Vymazať"
            >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            </button>

            {isEditing && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div className={styles.formCard} style={{ width: '100%', maxWidth: '500px', margin: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className={styles.cardHeader} style={{ justifyContent: 'space-between' }}>
                            <h3 className={styles.cardTitle}>Upraviť Produkt</h3>
                            <button onClick={() => setIsEditing(false)}><X size={20} /></button>
                        </div>
                        <div className={styles.formContent}>
                            <form action={handleUpdate} className={styles.grid}>
                                <input type="hidden" name="id" value={product.id} />

                                <div>
                                    <label className={styles.label}>Názov</label>
                                    <input name="title" defaultValue={product.title} required className={styles.input} />
                                </div>

                                <div>
                                    <label className={styles.label}>Kategória</label>
                                    <select name="category" defaultValue={product.category || 'Training'} className={styles.input} style={{ height: '42px', backgroundColor: 'white' }}>
                                        <option value="Training">Tréningy</option>
                                        <option value="Beauty">Beauty</option>
                                        <option value="Gift">Gift</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={styles.label}>Cena (€)</label>
                                    <input name="price" type="number" step="0.01" defaultValue={product.price} required className={styles.input} />
                                </div>

                                <div>
                                    <label className={styles.label}>Vstupy (len pre training)</label>
                                    <input name="credits" type="number" defaultValue={product.credit_amount} required className={styles.input} />
                                </div>

                                <div className={styles.fullWidth}>
                                    <label className={styles.label}>Popis</label>
                                    <textarea name="description" defaultValue={product.description || ''} className={styles.textarea} rows={3}></textarea>
                                </div>

                                <div className={styles.fullWidth} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" name="is_active" defaultChecked={product.is_active} id={`active-${product.id}`} />
                                    <label htmlFor={`active-${product.id}`} className={styles.label} style={{ marginBottom: 0, cursor: 'pointer' }}>Aktívny produkt</label>
                                </div>

                                <div className={styles.buttonRow}>
                                    <button type="button" onClick={() => setIsEditing(false)} className={styles.inactive} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white' }}>Zrušiť</button>
                                    <button type="submit" disabled={isSaving} className={styles.submitButton}>
                                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        Uložiť Zmeny
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
