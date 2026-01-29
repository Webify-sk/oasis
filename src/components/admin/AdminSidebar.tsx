'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Users, Dumbbell, UserCheck, LogOut, Gift, Calendar } from 'lucide-react';
import { signOut } from '@/app/auth/actions';
import styles from '@/components/dashboard/Sidebar.module.css'; // Reusing dashboard sidebar styles for consistency

const navItems = [
    { name: 'Užívatelia', href: '/admin/users', icon: Users },
    { name: 'Tréningy', href: '/admin/trainings', icon: Dumbbell },
    { name: 'Tréneri', href: '/admin/trainers', icon: UserCheck },
    { name: 'Vouchery', href: '/admin/vouchers', icon: Gift },
    { name: 'Kalendár', href: '/admin/calendar', icon: Calendar },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav}>
                <div style={{ padding: '1rem 2rem', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Admin Panel
                </div>
                <ul className={styles.navList}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={clsx(styles.navLink, { [styles.active]: isActive })}
                                >
                                    <Icon size={20} />
                                    <span>{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                <div className={styles.footer}>
                    <form action={signOut}>
                        <button className={styles.logoutButton}>
                            <LogOut size={20} />
                            <span>Odhlásiť sa</span>
                        </button>
                    </form>
                </div>
            </nav>
        </aside>
    );
}
