'use client';

import React, { useState, useEffect } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Users, Dumbbell, UserCheck, LogOut, Gift, Calendar, List, LayoutDashboard, Settings, FileText, UserPlus, Scissors, CreditCard, Menu, X } from 'lucide-react';
import { signOut } from '@/app/auth/actions';
import styles from '@/components/dashboard/Sidebar.module.css'; // Reusing dashboard sidebar styles for consistency

const navItems = [
    { name: 'Užívatelia', href: '/admin/users', icon: Users },
    { name: 'Tréningy', href: '/admin/trainings', icon: Dumbbell },
    { name: 'Pilates - Voľno', href: '/admin/vacations', icon: Calendar },
    { name: 'Zľavové kupóny', href: '/admin/coupons', icon: Gift },
    { name: 'Trainers', href: '/admin/trainers', icon: Users },
    { name: 'Kreditné balíky', href: '/admin/credits', icon: CreditCard },
    { name: 'Darčekové poukazy', href: '/admin/vouchers', icon: Gift },
    { name: 'Faktúry', href: '/admin/invoices', icon: FileText },
    { name: 'Kozmetika - Služby', href: '/admin/cosmetics/services', icon: List },
    { name: 'Kozmetika - Staff', href: '/admin/cosmetics/staff', icon: Users },
    { name: 'Kozmetika - Rezervácie', href: '/admin/cosmetics/reservations', icon: Calendar },
];

import { useUserRole } from '@/hooks/useUserRole';

// ...

export function AdminSidebar() {
    const pathname = usePathname();
    const { role } = useUserRole();
    const [isOpen, setIsOpen] = useState(false);

    // Close sidebar when navigating
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                className={styles.mobileToggle}
                onClick={() => setIsOpen(true)}
                aria-label="Otvoriť admin menu"
            >
                <Menu size={24} />
                <span>Admin Menu</span>
            </button>

            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className={styles.backdrop}
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside className={clsx(styles.sidebar, { [styles.open]: isOpen })}>
                {/* Mobile Header (Close Button) */}
                <div className={styles.mobileHeader}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Admin Menu</span>
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                        aria-label="Zavrieť admin menu"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className={styles.nav}>
                    <div style={{ padding: '1rem 2rem', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Admin Panel
                    </div>
                    <ul className={styles.navList}>
                        {navItems.filter(item => {
                            if (role === 'employee') {
                                // Employees only see Cosmetics
                                return item.href.startsWith('/admin/cosmetics');
                            }
                            return true;
                        }).map((item) => {
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
        </>
    );
}
