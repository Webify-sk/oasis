import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Header } from '@/components/layout/Header';
import styles from '@/app/dashboard/layout.module.css'; // Reusing layout styles
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Server-side Role Check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        redirect('/dashboard/trainings'); // Redirect non-admins to user dashboard
    }

    return (
        <div className={styles.container}>
            <Header />
            <div className={styles.pageWrapper}>
                <div className={styles.dashboardGrid}>
                    <aside className={styles.sidebarWrapper}>
                        <AdminSidebar />
                    </aside>
                    <main className={styles.contentArea}>
                        {children}
                    </main>
                </div>
            </div>
            <footer style={{ textAlign: 'center', padding: '2rem', fontSize: '0.8rem', color: '#888' }}>
                &copy; {new Date().getFullYear()} Oasis Lounge Admin
            </footer>
        </div>
    );
}
