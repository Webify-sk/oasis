import { InvoiceTable } from '@/components/dashboard/InvoiceTable';
import { CreditCounter } from '@/components/dashboard/CreditCounter';
import { getUserInvoices } from './actions';

export default async function InvoicesPage() {
    const invoices = await getUserInvoices();

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '2rem',
                padding: '2rem 1rem 0 1rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", color: '#93745F' }}>Faktúry</h1>

                <CreditCounter />
            </div>

            <div style={{ padding: '0 1rem' }}>
                <InvoiceTable invoices={invoices} />
            </div>
        </div>
    );
}
