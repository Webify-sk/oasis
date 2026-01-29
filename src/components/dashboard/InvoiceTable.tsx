import styles from './InvoiceTable.module.css';
import { mockInvoices } from '@/data/mockInvoices';
import { Download } from 'lucide-react';

export function InvoiceTable() {
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
                        {mockInvoices.map((invoice, index) => (
                            <tr key={index}>
                                <td className={styles.invoiceNumber}>{invoice.invoiceNumber}</td>
                                <td>{invoice.hours}</td>
                                <td className={styles.date}>{invoice.date}</td>
                                <td className={styles.amount}>{invoice.amount}</td>
                                <td>
                                    <span className={styles.status}>Uhradené</span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className={styles.actionButton} title="Stiahnuť PDF">
                                        <Download size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className={styles.pagination}>
                Zobrazené {mockInvoices.length} z {mockInvoices.length}
            </div>
        </div>
    );
}
