'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Sparkles, Users, Calendar, List } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

const tabs = [
    { name: 'Prehľad', href: '/dashboard/cosmetics', icon: Sparkles },
    { name: 'Moje rezervácie', href: '/dashboard/cosmetics/appointments', icon: List },
    { name: 'Kalendár', href: '/dashboard/cosmetics/calendar', icon: Calendar },
];

export default function CosmeticsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { role } = useUserRole();

    // Filter tabs
    const visibleTabs = tabs.filter(tab => {
        if (tab.href === '/dashboard/cosmetics/calendar') {
            return role === 'employee' || role === 'admin';
        }
        return true;
    });

    return (
        <div style={{ padding: '2rem' }}>




            {children}
        </div>
    );
}
