import { createClient } from '@/utils/supabase/server';
import { VoucherListActions } from '@/components/admin/VoucherListActions';
import { VoucherProductManager } from '@/components/admin/VoucherProductManager';
import { Package, Calendar, MoreHorizontal } from 'lucide-react';
import styles from '@/components/admin/VoucherAdmin.module.css';

export default async function AdminVouchersPage() {
    const supabase = await createClient();

    // Fetch existing products
    const { data: products } = await supabase
        .from('voucher_products')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className={styles.container}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", color: '#93745F' }}>Vouchery</h1>
            </div>

            <VoucherProductManager />

            <div className="space-y-4">
                <div className={styles.sectionHeader}>
                    <Package size={20} color="#9ca3af" />
                    <h2 className={styles.sectionTitle}>Existujúce Produkty</h2>
                    <span className={styles.countBadge}>
                        {products?.length || 0}
                    </span>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead className={styles.thead}>
                            <tr>
                                <th className={styles.th}>Názov</th>
                                <th className={styles.th}>Kategória</th>
                                <th className={styles.th} style={{ textAlign: 'right' }}>Cena</th>
                                <th className={styles.th} style={{ textAlign: 'right' }}>Vstupy</th>
                                <th className={styles.th} style={{ textAlign: 'center' }}>Status</th>
                                <th className={styles.th} style={{ textAlign: 'right' }}>Dátum</th>
                                <th className={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products?.map((product) => (
                                <tr key={product.id} className={styles.tr}>
                                    <td className={styles.td}>
                                        <div style={{ fontWeight: 500 }}>{product.title}</div>
                                        {product.description && (
                                            <div style={{ fontSize: '0.8rem', color: '#6b7280', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {product.description}
                                            </div>
                                        )}
                                    </td>
                                    {/* ... existing cells ... */}
                                    <td className={styles.td}>
                                        <span className={styles.categoryBadge}>
                                            {product.category}
                                        </span>
                                    </td>
                                    <td className={styles.td} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        {Number(product.price).toFixed(2)} €
                                    </td>
                                    <td className={styles.td} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        {product.credit_amount}
                                    </td>
                                    <td className={styles.td} style={{ textAlign: 'center' }}>
                                        <span className={`${styles.statusBadge} ${product.is_active ? styles.active : styles.inactive}`}>
                                            {product.is_active ? 'Aktívny' : 'Neaktívny'}
                                        </span>
                                    </td>
                                    <td className={styles.td} style={{ textAlign: 'right', fontSize: '0.8rem', color: '#9ca3af' }}>
                                        {new Date(product.created_at).toLocaleDateString()}
                                    </td>
                                    <td className={styles.td}>
                                        <VoucherListActions product={product} />
                                    </td>
                                </tr>
                            ))}
                            {/* ... empty state ... */}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
