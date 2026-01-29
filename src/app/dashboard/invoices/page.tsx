import { InvoiceTable } from '@/components/dashboard/InvoiceTable';
import { CreditCounter } from '@/components/dashboard/CreditCounter';

export default function InvoicesPage() {
    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: 'serif' }}>Faktúry</h1>

                <CreditCounter />
            </div>

            <div style={{ padding: '0 2rem' }}>
                <InvoiceTable />
            </div>
        </div>
    );
}
