import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/utils/check-role';
import { Users, FileText, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    title: 'Admin Dashboard | Oasis Lounge',
};

export default async function AdminDashboardPage() {
    await requireAdmin();
    const supabase = await createClient();

    // 1. Get Current User Info
    const { data: { user } } = await supabase.auth.getUser();
    let adminName = 'Admin';
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile?.full_name) {
            adminName = profile.full_name;
        }
    }

    // 2. Calculate Current Month Boundaries
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // 3. Fetch Quick Stats

    // A. Users Count
    const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    // B. This Month Invoices (Total Revenue)
    const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, status, document_type')
        .gte('created_at', firstDay)
        .lte('created_at', lastDay);

    let monthlyRevenue = 0;
    let monthlyInvoices = 0;
    invoices?.forEach(inv => {
        if (inv.document_type !== 'credit_note') {
            monthlyInvoices++;
            monthlyRevenue += inv.amount;
        }
    });

    // C. This Month Bookings & Appointments
    const { count: trainingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', firstDay)
        .lte('start_time', lastDay)
        .neq('status', 'cancelled');

    const { count: proceduresCount } = await supabase
        .from('cosmetic_appointments')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', firstDay)
        .lte('start_time', lastDay)
        .neq('status', 'cancelled');

    const totalReservations = (trainingsCount || 0) + (proceduresCount || 0);

    // D. Month formatting for display
    const currentMonthName = date.toLocaleDateString('sk-SK', { month: 'long' });

    return (
        <div style={{ padding: '0rem 1rem 2rem 1rem', width: '100%', minWidth: 0, animation: 'fadeIn 0.5s ease-in-out' }}>
            {/* Header Section */}
            <div style={{
                marginBottom: '2rem',
                padding: '1.5rem 0',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", color: '#111827', margin: 0 }}>
                    Vitajte späť, <span style={{ color: '#93745F', fontWeight: 600 }}>{adminName}</span> 👋
                </h1>
                <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '1.05rem' }}>
                    Toto je váš rýchly prehľad zdravia biznisu za aktuálny mesiac ({currentMonthName}).
                </p>
            </div>

            {/* Top Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>

                {/* Revenue Card */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderTop: '4px solid #10b981', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                        <TrendingUp size={20} color="#10b981" />
                        Tržby (Tento mesiac)
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', fontFamily: 'var(--font-heading)' }}>
                        {new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(monthlyRevenue)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Z vygenerovaných {monthlyInvoices} faktúr</div>
                </div>

                {/* Reservations Card */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderTop: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                        <Calendar size={20} color="#3b82f6" />
                        Rezervácie (Tento mesiac)
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', fontFamily: 'var(--font-heading)' }}>
                        {totalReservations}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{trainingsCount} Tréningov | {proceduresCount} Procedúr</div>
                </div>

                {/* Users Card */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderTop: '4px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                        <Users size={20} color="#f59e0b" />
                        Registrovaní Klienti
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', fontFamily: 'var(--font-heading)' }}>
                        {totalUsers || 0}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Celkový počet účtov v systéme</div>
                </div>

            </div>

            {/* Quick Actions / Shortcuts */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#374151', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>Rýchle Akcie</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <Link href="/admin/invoices" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#374151', fontWeight: 500, transition: 'background-color 0.2s', border: '1px solid #e5e7eb' }}>
                        <div style={{ backgroundColor: '#e2e8f0', padding: '0.5rem', borderRadius: '6px' }}>
                            <FileText size={20} color="#475569" />
                        </div>
                        Správa Faktúr
                    </Link>

                    <Link href="/admin/statistics" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#374151', fontWeight: 500, transition: 'background-color 0.2s', border: '1px solid #e5e7eb' }}>
                        <div style={{ backgroundColor: '#dcfce7', padding: '0.5rem', borderRadius: '6px' }}>
                            <TrendingUp size={20} color="#16a34a" />
                        </div>
                        Detailné Štatistiky
                    </Link>

                    <Link href="/admin/cosmetics/reservations" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#374151', fontWeight: 500, transition: 'background-color 0.2s', border: '1px solid #e5e7eb' }}>
                        <div style={{ backgroundColor: '#dbeafe', padding: '0.5rem', borderRadius: '6px' }}>
                            <Calendar size={20} color="#2563eb" />
                        </div>
                        Kozmetika Diár
                    </Link>

                    <Link href="/admin/trainings" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', textDecoration: 'none', color: '#374151', fontWeight: 500, transition: 'background-color 0.2s', border: '1px solid #e5e7eb' }}>
                        <div style={{ backgroundColor: '#fef3c7', padding: '0.5rem', borderRadius: '6px' }}>
                            <Users size={20} color="#d97706" />
                        </div>
                        Rozvrh Tréningov
                    </Link>
                </div>
            </div>
        </div>
    );
}
