'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { User, Dumbbell, CreditCard, FileText, Medal, LogOut, ShieldCheck, Gift, Calendar, Home, Menu, X, Sparkles, Clock } from 'lucide-react';
import { signOut } from '@/app/auth/actions';
import { useUserRole } from '@/hooks/useUserRole';
import styles from './Sidebar.module.css';
import { useVerification } from '@/components/auth/VerificationContext';

const navGroups = [
    {
        title: null,
        items: [
            { name: 'Domov', href: '/dashboard', icon: Home },
            { name: 'Môj profil', href: '/dashboard/profile', icon: User },
        ]
    },
    {
        title: 'Fitness & Tréningy',
        items: [
            { name: 'Tréningy', href: '/dashboard/trainings', icon: Dumbbell },
            { name: 'Rozvrh tréningov', href: '/dashboard/calendar', icon: Calendar },
            { name: 'Dobiť vstupy', href: '/dashboard/credit', icon: CreditCard },
            { name: 'Míľniky', href: '/dashboard/milestones', icon: Medal },
        ]
    },
    {
        title: 'Beauty & Body',
        items: [
            { name: 'Procedúry', href: '/dashboard/cosmetics', icon: Sparkles },
            { name: 'Rezervácie', href: '/dashboard/cosmetics/appointments', icon: Calendar },
            { name: 'Moja dostupnosť', href: '/dashboard/cosmetics/availability', icon: Clock, employeeOnly: true },
        ]
    },
    {
        title: 'Ostatné',
        items: [
            { name: 'Darčekové poukazy', href: '/dashboard/gift-vouchers', icon: Gift },
            { name: 'Faktúry', href: '/dashboard/invoices', icon: FileText },
        ]
    }
];

export function Sidebar() {
    const pathname = usePathname();
    const { role } = useUserRole();
    const { isVerified } = useVerification();
    const [isOpen, setIsOpen] = useState(false);

    // Close sidebar when navigating
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const publicGroups = navGroups.slice(0, 1);
    const restrictedGroups = navGroups.slice(1);

    const renderGroups = (groups: typeof navGroups) => {
        // ... (keep renderGroups implementation same as original lines 56-117)
        return groups.map((group, groupIndex) => {
            const visibleItems = group.items.filter(item => {
                if (role === 'employee') {
                    const hiddenForEmployee = [
                        '/dashboard/trainings',
                        '/dashboard/calendar',
                        '/dashboard/credit',
                        '/dashboard/milestones',
                        '/dashboard/gift-vouchers',
                        '/dashboard/invoices'
                    ];
                    if (hiddenForEmployee.includes(item.href)) return false;
                }
                if (role !== 'employee' && role !== 'admin') {
                    // @ts-ignore
                    if (item.employeeOnly) return false;
                }
                return true;
            });

            if (visibleItems.length === 0) return null;

            return (
                <React.Fragment key={group.title || groupIndex}>
                    {group.title && (
                        <li className={styles.groupTitle} style={{
                            padding: '0.75rem 1.5rem 0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: 'rgba(255, 255, 255, 0.7)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginTop: '0.5rem'
                        }}>
                            {group.title}
                        </li>
                    )}
                    {visibleItems.map((item) => {
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
                </React.Fragment>
            );
        });
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                className={styles.mobileToggle}
                onClick={() => setIsOpen(true)}
                aria-label="Otvoriť menu"
            >
                <Menu size={24} />
                <span>Menu</span>
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
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Menu</span>
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                        aria-label="Zavrieť menu"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className={styles.nav}>
                    <ul className={styles.navList}>
                        {/* Public Groups (Always Visible) */}
                        {renderGroups(publicGroups)}

                        {/* Restricted Groups (Locked if unverified) */}
                        <div className="relative" style={{ position: 'relative', flex: 1 }}>
                            <div style={{
                                filter: !isVerified ? 'blur(4px)' : 'none',
                                opacity: !isVerified ? 0.5 : 1,
                                pointerEvents: !isVerified ? 'none' : 'auto',
                                userSelect: !isVerified ? 'none' : 'auto',
                                transition: 'all 0.3s ease'
                            }}>
                                {renderGroups(restrictedGroups)}
                            </div>

                            {/* Overlay Message */}
                            {!isVerified && (
                                <div style={{
                                    position: 'absolute',
                                    top: '0',
                                    left: 0,
                                    right: 0,
                                    bottom: 0, // Cover the restricted area
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    paddingTop: '2rem', // Push text down a bit
                                    zIndex: 10
                                }}>
                                    <div style={{
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        width: '85%',
                                        textAlign: 'center',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                        border: '1px solid #FFE4E6'
                                    }}>
                                        <p style={{ fontSize: '0.9rem', color: '#9F1239', fontWeight: '600', marginBottom: '0.2rem' }}>
                                            🔒 Zamknuté
                                        </p>
                                        <p style={{ fontSize: '0.8rem', color: '#881337' }}>
                                            Pre odomknutie menu overte svoj email
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {role === 'admin' && (
                            <li key="/admin/users">
                                <Link
                                    href="/admin/users"
                                    className={clsx(styles.navLink, { [styles.active]: pathname.startsWith('/admin') })}
                                    style={{ color: '#8C4848' }} // Distinct color for admin
                                >
                                    <ShieldCheck size={20} />
                                    <span style={{ marginLeft: '10px' }}>Admin Panel</span>
                                </Link>
                            </li>
                        )}
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
