import { getAllInvoices } from '@/app/admin/invoices/actions';
import { AdminInvoiceList } from '@/components/admin/AdminInvoiceList';

export default async function AdminInvoicesPage() {
    const invoices = await getAllInvoices();

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", color: '#93745F' }}>Prehľad faktúr</h1>
            </div>

            <div style={{ padding: '0 2rem' }}>
                <AdminInvoiceList invoices={invoices} />
            </div>
        </div>
    );
}
