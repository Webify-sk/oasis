'use client';

import { AdminInvoice } from '@/app/admin/invoices/actions';
import { Download, FileText, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminInvoiceListProps {
    invoices: AdminInvoice[];
}

export function AdminInvoiceList({ invoices }: AdminInvoiceListProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<AdminInvoice | null>(null);

    const filteredInvoices = invoices.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.user?.full_name && invoice.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (!invoices || invoices.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                Zatiaľ nie sú žiadne faktúry.
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                <input
                    type="text"
                    placeholder="Hľadať podľa čísla, emailu alebo mena..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.8rem',
                        borderRadius: '8px',
                        border: '1px solid #E5E0DD',
                        outline: 'none'
                    }}
                />
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E0DD', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #E5E0DD' }}>
                        <tr>
                            <th style={{ padding: '1rem', fontWeight: 500, fontSize: '0.85rem', color: '#666' }}>Číslo</th>
                            <th style={{ padding: '1rem', fontWeight: 500, fontSize: '0.85rem', color: '#666' }}>Klient</th>
                            <th style={{ padding: '1rem', fontWeight: 500, fontSize: '0.85rem', color: '#666' }}>Dátum</th>
                            <th style={{ padding: '1rem', fontWeight: 500, fontSize: '0.85rem', color: '#666' }}>Suma</th>
                            <th style={{ padding: '1rem', fontWeight: 500, fontSize: '0.85rem', color: '#666' }}>Stav</th>
                            <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 500, fontSize: '0.85rem', color: '#666' }}>Akcia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInvoices.map((invoice) => (
                            <tr key={invoice.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>{invoice.invoice_number}</td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 500 }}>{invoice.user?.full_name || 'Neznámy'}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{invoice.user?.email}</div>
                                </td>
                                <td style={{ padding: '1rem', color: '#444' }}>
                                    {new Date(invoice.created_at).toLocaleDateString('sk-SK')}
                                </td>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>
                                    {new Intl.NumberFormat('sk-SK', { style: 'currency', currency: invoice.currency || 'EUR' }).format(invoice.amount)}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '999px',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        backgroundColor: invoice.status === 'paid' ? '#dcfce7' : '#f3f4f6',
                                        color: invoice.status === 'paid' ? '#166534' : '#374151'
                                    }}>
                                        {invoice.status === 'paid' ? 'Uhradené' : invoice.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <button
                                        onClick={() => window.open(`/api/invoices/${invoice.id}/download`, '_blank')}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#666',
                                            padding: '0.4rem',
                                            borderRadius: '4px'
                                        }}
                                        title="Stiahnuť PDF"
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <Download size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setInvoiceToDelete(invoice);
                                            setDeleteModalOpen(true);
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#dc2626',
                                            padding: '0.4rem',
                                            borderRadius: '4px',
                                            marginLeft: '0.5rem'
                                        }}
                                        title="Vymazať faktúru"
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredInvoices.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                        Nenašli sa žiadne faktúry pre "{searchTerm}"
                    </div>
                )}
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666', textAlign: 'right' }}>
                Zobrazených {filteredInvoices.length} z {invoices.length} faktúr
            </div>

            {/* Custom Delete Modal */}
            {deleteModalOpen && invoiceToDelete && (
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
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
                            Vymazať faktúru?
                        </h3>
                        <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>
                            Naozaj chcete vymazať faktúru <strong>{invoiceToDelete.invoice_number}</strong>?
                            Táto akcia je nevratná a faktúra bude trvalo odstránená.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                    setInvoiceToDelete(null);
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Zrušiť
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const { deleteInvoice } = await import('@/app/admin/invoices/actions');
                                        await deleteInvoice(invoiceToDelete.id);
                                        setDeleteModalOpen(false);
                                        setInvoiceToDelete(null);
                                        router.refresh();
                                    } catch (e) {
                                        alert('Chyba pri mazaní faktúry.');
                                        console.error(e);
                                    }
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Vymazať
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
