import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/layout/Header';
import styles from './layout.module.css';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.container}>
            <Header />
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
    );
}
