'use client';

import { AdminInvoice } from '@/app/admin/invoices/actions';
import { Download, FileText, Search } from 'lucide-react';
import { useState } from 'react';

interface AdminInvoiceListProps {
    invoices: AdminInvoice[];
}

export function AdminInvoiceList({ invoices }: AdminInvoiceListProps) {
    const [searchTerm, setSearchTerm] = useState('');

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
        </div>
    );
}
