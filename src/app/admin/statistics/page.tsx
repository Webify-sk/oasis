import { getAdminStatistics } from '@/actions/statistics-actions';
import StatisticsDashboard from '@/components/admin/statistics/StatisticsDashboard';
import { requireAdmin } from '@/utils/check-role';

export const metadata = {
    title: 'Štatistiky | Oasis Lounge',
    description: 'Štatistiky tréningov a procedúr',
};

export default async function AdminStatisticsPage() {
    await requireAdmin();

    const { items, error } = await getAdminStatistics();

    return (
        <div style={{ padding: '0rem', width: '100%', minWidth: 0 }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '1.5rem 1rem 0 1rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", display: 'flex', alignItems: 'center', gap: '1rem', color: '#93745F' }}>
                    Štatistiky
                    <span style={{ fontSize: '1.2rem', backgroundColor: '#f3f4f6', padding: '0.2rem 0.8rem', borderRadius: '999px', color: '#6b7280', fontFamily: 'var(--font-geist-sans)' }}>
                        {items.length}
                    </span>
                </h1>
            </div>

            <div style={{ padding: '0 1rem 2rem 1rem' }}>
                {error ? (
                    <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '8px', border: '1px solid #f87171' }}>
                        Nastala chyba pri načítavaní štatistík: {error}
                    </div>
                ) : (
                    <StatisticsDashboard initialItems={items} />
                )}
            </div>
        </div>
    );
}
