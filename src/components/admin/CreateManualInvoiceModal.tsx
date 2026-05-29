'use client';

import { useState } from 'react';
import { createManualInvoice, AdminInvoice } from '@/app/admin/invoices/actions';
import { useRouter } from 'next/navigation';

interface CreateManualInvoiceModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateManualInvoiceModal({ onClose, onSuccess }: CreateManualInvoiceModalProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState<Partial<AdminInvoice>>({
        amount: 0,
        description: 'Manuálna faktúra',
        service_type: 'Služba',
        status: 'paid',
        discount_amount: 0,
        billing_name: '',
        billing_street: '',
        billing_city: '',
        billing_zip: '',
        billing_country: 'Slovensko',
        company_name: '',
        company_ico: '',
        company_dic: '',
        company_ic_dph: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createManualInvoice(formData);
            onSuccess();
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert('Chyba pri vytváraní manuálnej faktúry.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '0.5rem',
                maxWidth: '800px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1f2937' }}>
                    Nová manuálna faktúra
                </h3>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* Left Column - General Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ margin: 0, color: '#4b5563', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Základné údaje</h4>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                <span>Suma (EUR) *</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                    style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                <span>Popis (Položka) *</span>
                                <input
                                    type="text"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                <span>Typ služby</span>
                                <input
                                    type="text"
                                    value={formData.service_type || ''}
                                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                                    style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                <span>Zľava (EUR)</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.discount_amount || ''}
                                    onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) })}
                                    style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                <span>Stav</span>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', backgroundColor: 'white' }}
                                >
                                    <option value="paid">Uhradené (paid)</option>
                                    <option value="pending">Čakajúce (pending)</option>
                                </select>
                            </label>
                        </div>

                        {/* Right Column - Billing Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ margin: 0, color: '#4b5563', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Fakturačné údaje</h4>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                <span>Meno / Názov spoločnosti *</span>
                                <input
                                    type="text"
                                    required
                                    value={formData.billing_name || ''}
                                    onChange={(e) => setFormData({ ...formData, billing_name: e.target.value })}
                                    style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                <span>Ulica a číslo *</span>
                                <input
                                    type="text"
                                    required
                                    value={formData.billing_street || ''}
                                    onChange={(e) => setFormData({ ...formData, billing_street: e.target.value })}
                                    style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                <span>Mesto *</span>
                                <input
                                    type="text"
                                    required
                                    value={formData.billing_city || ''}
                                    onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                                    style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                />
                            </label>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>PSČ *</span>
                                    <input
                                        type="text"
                                        required
                                        value={formData.billing_zip || ''}
                                        onChange={(e) => setFormData({ ...formData, billing_zip: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Krajina</span>
                                    <input
                                        type="text"
                                        value={formData.billing_country || ''}
                                        onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>
                            </div>

                            <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h5 style={{ margin: 0, color: '#4b5563', fontSize: '0.875rem', fontWeight: 600 }}>Firemné údaje (Voliteľné)</h5>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Názov spoločnosti</span>
                                    <input
                                        type="text"
                                        value={formData.company_name || ''}
                                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>IČO</span>
                                    <input
                                        type="text"
                                        value={formData.company_ico || ''}
                                        onChange={(e) => setFormData({ ...formData, company_ico: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                        <span>DIČ</span>
                                        <input
                                            type="text"
                                            value={formData.company_dic || ''}
                                            onChange={(e) => setFormData({ ...formData, company_dic: e.target.value })}
                                            style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                        />
                                    </label>

                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                        <span>IČ DPH</span>
                                        <input
                                            type="text"
                                            value={formData.company_ic_dph || ''}
                                            onChange={(e) => setFormData({ ...formData, company_ic_dph: e.target.value })}
                                            style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                fontWeight: 500,
                                border: 'none',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Zrušiť
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                backgroundColor: '#93745F',
                                color: 'white',
                                fontWeight: 500,
                                border: 'none',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isSubmitting ? 'Vytváram...' : 'Vytvoriť faktúru'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
