'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { User, Dumbbell, CreditCard, FileText, Medal, LogOut, ShieldCheck, Gift, Calendar, Home, Menu, X } from 'lucide-react';
import { signOut } from '@/app/auth/actions';
import { useUserRole } from '@/hooks/useUserRole';
import styles from './Sidebar.module.css';

// ...

const navItems = [
    { name: 'Domov', href: '/dashboard', icon: Home },
    { name: 'Môj profil', href: '/dashboard/profile', icon: User },
    { name: 'Tréningy', href: '/dashboard/trainings', icon: Dumbbell },
    { name: 'Dobiť vstupy', href: '/dashboard/credit', icon: CreditCard },
    { name: 'Darčekové poukazy', href: '/dashboard/gift-vouchers', icon: Gift },
    { name: 'Faktúry', href: '/dashboard/invoices', icon: FileText },
    { name: 'Kalendár', href: '/dashboard/calendar', icon: Calendar },
    { name: 'Míľniky', href: '/dashboard/milestones', icon: Medal },
];

export function Sidebar() {
    const pathname = usePathname();
    const { role } = useUserRole();

    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav}>
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

                    {role === 'admin' && (
                        <li key="/admin/users">
                            <Link
                                href="/admin/users"
                                className={clsx(styles.navLink, { [styles.active]: pathname.startsWith('/admin') })}
                                style={{ color: '#8C4848' }} // Distinct color for admin
                            >
                                <ShieldCheck size={20} />
                                <span>Admin Panel</span>
                            </Link>
                        </li>
                    )}
                </ul>
                <div className={styles.footer}>
                    {/* Debug Info */}
                    <div style={{ fontSize: '0.7rem', color: '#ccc', marginBottom: '0.5rem', textAlign: 'center' }}>
                        Role: {role || 'loading...'}
                    </div>

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
