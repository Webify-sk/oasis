import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/layout/Header';
import styles from './layout.module.css';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { VerificationProvider } from '@/components/auth/VerificationContext';
import { VerificationBanner } from '@/components/auth/VerificationBanner';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('email_verified, role')
        .eq('id', user.id)
        .single();

    // Logic: Exempt if employee/admin OR if explicitly verified
    const isStaff = profile?.role === 'employee' || profile?.role === 'admin';
    const isVerified = isStaff || (profile?.email_verified !== false);

    return (
        <VerificationProvider isVerified={isVerified}>
            <div className={styles.container}>
                <Header />
                <VerificationBanner isVerified={isVerified} />
                <div className={styles.pageWrapper}>
                    <div className={styles.dashboardGrid}>
                        <aside className={styles.sidebarWrapper}>
                            <Sidebar />
                        </aside>
                        <main className={styles.contentArea}>
                            {children}
                        </main>
                    </div>
                </div>
                <footer style={{ textAlign: 'center', padding: '2rem', fontSize: '0.8rem', color: '#888' }}>
                    &copy; {new Date().getFullYear()} Oasis Lounge | Všetky práva vyhradené
                </footer>
            </div>
        </VerificationProvider>
    );
}
