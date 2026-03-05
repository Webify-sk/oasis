'use client';

import { AdminInvoice, updateInvoice, createCreditNote } from '@/app/admin/invoices/actions';
import { Download, Search, Trash2, ArchiveRestore, Edit2, Undo2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface AdminInvoiceListProps {
    invoices: AdminInvoice[];
}

export function AdminInvoiceList({ invoices }: AdminInvoiceListProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<AdminInvoice | null>(null);
    const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
    const [isDownloading, setIsDownloading] = useState(false);

    // Refund Modal State
    const [refundModalOpen, setRefundModalOpen] = useState(false);
    const [invoiceToRefund, setInvoiceToRefund] = useState<AdminInvoice | null>(null);

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Partial<AdminInvoice> | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // Extract unique months from invoices for the filter dropdown
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        invoices.forEach(inv => {
            const date = new Date(inv.created_at);
            // Format as YYYY-MM
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(monthStr);
        });
        // Sort descending
        return Array.from(months).sort().reverse();
    }, [invoices]);

    // Format month for display (e.g. "2024-03" -> "Marec 2024")
    const formatMonthDisplay = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' });
    };

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (invoice.user?.full_name && invoice.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

        let matchesMonth = true;
        if (selectedMonth !== 'all') {
            const date = new Date(invoice.created_at);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            matchesMonth = monthStr === selectedMonth;
        }

        return matchesSearch && matchesMonth;
    });

    const toggleSelectAll = () => {
        if (selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0) {
            setSelectedInvoices(new Set());
        } else {
            const newSelected = new Set(filteredInvoices.map(inv => inv.id));
            setSelectedInvoices(newSelected);
        }
    };

    const toggleSelectInvoice = (id: string) => {
        const newSelected = new Set(selectedInvoices);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedInvoices(newSelected);
    };

    // Automatically select all filtered invoices when month changes, if not 'all'
    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMonth = e.target.value;
        setSelectedMonth(newMonth);

        if (newMonth !== 'all') {
            const matchingInvoices = invoices.filter(invoice => {
                const date = new Date(invoice.created_at);
                const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return monthStr === newMonth;
            });
            setSelectedInvoices(new Set(matchingInvoices.map(inv => inv.id)));
        } else {
            setSelectedInvoices(new Set());
        }
    };

    const handleBulkDownload = async () => {
        if (selectedInvoices.size === 0) return;
        setIsDownloading(true);

        try {
            const response = await fetch('/api/invoices/bulk-download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ invoiceIds: Array.from(selectedInvoices) }),
            });

            if (!response.ok) {
                throw new Error('Failed to download invoices');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `faktury-export-${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            alert('Nastala chyba pri hromadnom sťahovaní faktúr.');
        } finally {
            setIsDownloading(false);
        }
    };

    const openEditModal = (invoice: AdminInvoice) => {
        setEditingInvoice({
            id: invoice.id,
            invoice_number: invoice.invoice_number, // display only
            description: invoice.description,
            amount: invoice.amount,
            created_at: new Date(invoice.created_at).toISOString().slice(0, 16), // for datetime-local input
            status: invoice.status,
            variable_symbol: invoice.variable_symbol || '',
            billing_name: invoice.billing_name || '',
            billing_street: invoice.billing_street || '',
            billing_city: invoice.billing_city || '',
            billing_zip: invoice.billing_zip || '',
            billing_country: invoice.billing_country || 'Slovensko',
            discount_amount: invoice.discount_amount || 0,
            service_type: invoice.service_type || 'Služba'
        });
        setEditModalOpen(true);
    };

    const handleEditSave = async () => {
        if (!editingInvoice?.id) return;

        setIsUpdating(true);
        try {
            // Convert the local datetime string back to ISO before saving
            const payload = { ...editingInvoice };
            if (payload.created_at) {
                payload.created_at = new Date(payload.created_at).toISOString();
            }

            await updateInvoice(editingInvoice.id, payload);
            setEditModalOpen(false);
            setEditingInvoice(null);
            router.refresh();
        } catch (error) {
            console.error('Update error:', error);
            alert('Chyba pri ukladaní faktúry.');
        } finally {
            setIsUpdating(false);
        }
    };

    if (!invoices || invoices.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                Zatiaľ nie sú žiadne faktúry.
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flex: '1 1 auto', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', maxWidth: '400px', flex: '1 1 300px' }}>
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
                    <select
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid #E5E0DD',
                            outline: 'none',
                            backgroundColor: 'white',
                            color: '#333',
                            minWidth: '200px'
                        }}
                    >
                        <option value="all">Všetky mesiace</option>
                        {availableMonths.map(month => (
                            <option key={month} value={month}>
                                {formatMonthDisplay(month)}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedInvoices.size > 0 && (
                    <button
                        onClick={handleBulkDownload}
                        disabled={isDownloading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#93745F',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isDownloading ? 'not-allowed' : 'pointer',
                            fontWeight: 500,
                            opacity: isDownloading ? 0.7 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        <ArchiveRestore size={18} />
                        {isDownloading ? 'Pripravujem ZIP...' : `Stiahnuť vybrané (${selectedInvoices.size})`}
                    </button>
                )}
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E0DD', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #E5E0DD' }}>
                        <tr>
                            <th style={{ padding: '1rem', width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0}
                                    onChange={toggleSelectAll}
                                    style={{ cursor: 'pointer' }}
                                />
                            </th>
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
                            <tr key={invoice.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: selectedInvoices.has(invoice.id) ? '#faf9f8' : 'transparent' }}>
                                <td style={{ padding: '1rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedInvoices.has(invoice.id)}
                                        onChange={() => toggleSelectInvoice(invoice.id)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </td>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                                        {invoice.invoice_number}
                                        {invoice.document_type === 'credit_note' && (
                                            <span style={{
                                                fontSize: '0.65rem',
                                                backgroundColor: '#fef08a',
                                                color: '#854d0e',
                                                padding: '0.1rem 0.4rem',
                                                borderRadius: '4px',
                                                textTransform: 'uppercase'
                                            }}>
                                                Dobropis
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 500 }}>{invoice.user?.full_name || 'Neznámy'}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{invoice.user?.email}</div>
                                    {invoice.document_type === 'credit_note' && invoice.related_invoice_id && (
                                        <div style={{ fontSize: '0.75rem', color: '#854d0e', marginTop: '0.2rem' }}>
                                            K faktúre: {
                                                // We can't easily fetch the related invoice string without an extra query, 
                                                // but we injected this into the description so we'll rely on that or a later join
                                                invoice.description.includes('č.') ? invoice.description.split('č. ')[1] : 'Nešpecifikované'
                                            }
                                        </div>
                                    )}
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
                                        onClick={() => openEditModal(invoice)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#666',
                                            padding: '0.4rem',
                                            borderRadius: '4px'
                                        }}
                                        title="Upraviť faktúru"
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => window.open(`/api/invoices/${invoice.id}/download`, '_blank')}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#666',
                                            padding: '0.4rem',
                                            borderRadius: '4px',
                                            marginLeft: '0.5rem'
                                        }}
                                        title="Stiahnuť PDF"
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <Download size={18} />
                                    </button>

                                    {invoice.document_type !== 'credit_note' && (
                                        <button
                                            onClick={() => {
                                                setInvoiceToRefund(invoice);
                                                setRefundModalOpen(true);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#eab308',
                                                padding: '0.4rem',
                                                borderRadius: '4px',
                                                marginLeft: '0.5rem'
                                            }}
                                            title="Vystaviť Dobropis / Stornovať"
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef08a'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <Undo2 size={18} />
                                        </button>
                                    )}

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
                        Nenašli sa žiadne faktúry pre "{searchTerm}" {selectedMonth !== 'all' ? `v mesiaci ${formatMonthDisplay(selectedMonth)}` : ''}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666', textAlign: 'right' }}>
                Zobrazených {filteredInvoices.length} z {invoices.length} faktúr
            </div>

            {/* Edit Invoice Modal */}
            {editModalOpen && editingInvoice && (
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
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1f2937' }}>
                            Upraviť faktúru: {editingInvoice.invoice_number}
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            {/* Left Column - General Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h4 style={{ margin: 0, color: '#4b5563', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Základné údaje</h4>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Suma (EUR)</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingInvoice.amount || 0}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, amount: parseFloat(e.target.value) })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Popis (Položka)</span>
                                    <input
                                        type="text"
                                        value={editingInvoice.description || ''}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, description: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Typ služby</span>
                                    <input
                                        type="text"
                                        value={editingInvoice.service_type || ''}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, service_type: e.target.value })}
                                        placeholder="napr. Služba"
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Zľava (EUR)</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingInvoice.discount_amount || 0}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, discount_amount: parseFloat(e.target.value) })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Variabilný symbol</span>
                                    <input
                                        type="text"
                                        value={editingInvoice.variable_symbol || ''}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, variable_symbol: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Dátum vystavenia</span>
                                    <input
                                        type="datetime-local"
                                        value={editingInvoice.created_at || ''}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, created_at: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Stav</span>
                                    <select
                                        value={editingInvoice.status || 'pending'}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, status: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', backgroundColor: 'white' }}
                                    >
                                        <option value="paid">Uhradené (paid)</option>
                                        <option value="pending">Čakajúce (pending)</option>
                                        <option value="failed">Zlyhané (failed)</option>
                                    </select>
                                </label>
                            </div>

                            {/* Right Column - Billing Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h4 style={{ margin: 0, color: '#4b5563', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Fakturačné údaje</h4>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Meno / Názov spoločnosti</span>
                                    <input
                                        type="text"
                                        value={editingInvoice.billing_name || ''}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, billing_name: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Ulica a číslo</span>
                                    <input
                                        type="text"
                                        value={editingInvoice.billing_street || ''}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, billing_street: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Mesto</span>
                                    <input
                                        type="text"
                                        value={editingInvoice.billing_city || ''}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, billing_city: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>PSČ</span>
                                    <input
                                        type="text"
                                        value={editingInvoice.billing_zip || ''}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, billing_zip: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>
                                    <span>Krajina</span>
                                    <input
                                        type="text"
                                        value={editingInvoice.billing_country || ''}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, billing_country: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                            <button
                                onClick={() => {
                                    setEditModalOpen(false);
                                    setEditingInvoice(null);
                                }}
                                disabled={isUpdating}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: isUpdating ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Zrušiť
                            </button>
                            <button
                                onClick={handleEditSave}
                                disabled={isUpdating}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: '#93745F',
                                    color: 'white',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                                    opacity: isUpdating ? 0.7 : 1
                                }}
                            >
                                {isUpdating ? 'Ukladám...' : 'Uložiť zmeny'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Refund / Credit Note Modal */}
            {refundModalOpen && invoiceToRefund && (
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
                        maxWidth: '450px',
                        width: '90%',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
                            Vystaviť Dobropis / Storno
                        </h3>
                        <p style={{ color: '#4b5563', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            Skutočne chcete vystaviť dobropis (opravný doklad) k faktúre <strong>{invoiceToRefund.invoice_number}</strong>?<br /><br />
                            Táto akcia vytvorí nový doklad so zápornou sumou (<strong>-{invoiceToRefund.amount} EUR</strong>), čím faktúru "stornuje". Pôvodná faktúra ostane v systéme.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button
                                onClick={() => {
                                    setRefundModalOpen(false);
                                    setInvoiceToRefund(null);
                                }}
                                disabled={isUpdating}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: isUpdating ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Zrušiť
                            </button>
                            <button
                                onClick={async () => {
                                    setIsUpdating(true);
                                    try {
                                        await createCreditNote(invoiceToRefund.id);
                                        setRefundModalOpen(false);
                                        setInvoiceToRefund(null);
                                        router.refresh();
                                    } catch (e: any) {
                                        alert(e.message || 'Chyba pri vytváraní dobropisu.');
                                        console.error(e);
                                    } finally {
                                        setIsUpdating(false);
                                    }
                                }}
                                disabled={isUpdating}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: '#ca8a04', // yellow-600
                                    color: 'white',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                                    opacity: isUpdating ? 0.7 : 1
                                }}
                            >
                                {isUpdating ? 'Vytváram...' : 'Vystaviť Dobropis'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
