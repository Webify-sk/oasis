import { Invoice } from '@/app/dashboard/invoices/actions';
import styles from './InvoiceTable.module.css';
import { Download, FileText } from 'lucide-react';

interface InvoiceTableProps {
    invoices: Invoice[];
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
    if (!invoices || invoices.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.card} style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                    <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>Zatiaľ nemáte žiadne faktúry.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Prehľad faktúr</h3>
            </div>

            <div className={styles.card}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Číslo Fa</th>
                            <th>Popis</th>
                            <th>Dátum</th>
                            <th>Suma</th>
                            <th>Stav</th>
                            <th style={{ textAlign: 'right' }}>Akcia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((invoice) => {
                            // Format date
                            const dateObj = new Date(invoice.created_at);
                            const dateStr = dateObj.toLocaleDateString('sk-SK');

                            // Format amount
                            const amountStr = new Intl.NumberFormat('sk-SK', { style: 'currency', currency: invoice.currency || 'EUR' }).format(invoice.amount);

                            return (
                                <tr key={invoice.id}>
                                    <td className={styles.invoiceNumber}>{invoice.invoice_number}</td>
                                    <td>{invoice.description || 'Nákup'}</td>
                                    <td className={styles.date}>{dateStr}</td>
                                    <td className={styles.amount}>{amountStr}</td>
                                    <td>
                                        <span className={styles.status}>
                                            {invoice.status === 'paid' ? 'Uhradené' : invoice.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className={styles.actionButton} title="Stiahnuť PDF" disabled={true} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                            <Download size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className={styles.pagination}>
                Zobrazené {invoices.length} z {invoices.length}
            </div>
        </div>
    );
}


