'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Eye, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import styles from './UserList.module.css';

interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    role: string | null;
    credits: number | null;
}

export function UserList({ users }: { users: Profile[] }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user => {
        const term = searchTerm.toLowerCase();
        return (
            (user.full_name?.toLowerCase() || '').includes(term) ||
            (user.email?.toLowerCase() || '').includes(term) ||
            (user.phone?.toLowerCase() || '').includes(term)
        );
    });

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3 className={styles.title}>Užívatelia</h3>
                <div className={styles.searchContainer}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Hľadať meno, email, telefón..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <table className={styles.table}>
                <thead className={styles.thead}>
                    <tr>
                        <th className={styles.th}>Meno a priezvisko</th>
                        <th className={styles.th}>Email</th>
                        <th className={styles.th}>Telefón</th>
                        <th className={styles.th}>Vstupy</th>
                        <th className={styles.th}>Akcie</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.map((user) => (
                        <tr key={user.id} className={styles.tr}>
                            <td className={styles.td}>{user.full_name || 'Nezadané'}</td>
                            <td className={styles.tdSecondary}>{user.email}</td>
                            <td className={styles.tdSecondary}>{user.phone || '-'}</td>
                            <td className={styles.tdSecondary}>{user.credits}</td>
                            <td className={styles.td}>
                                <div className={styles.actions}>
                                    <Link href={`/admin/users/${user.id}`} style={{ textDecoration: 'none' }}>
                                        <Button className={styles.detailButton} size="sm">
                                            <Eye size={14} />
                                            Zobraziť detail
                                        </Button>
                                    </Link>
                                    {/* 
                                    <Button variant="primary" size="sm" style={{ backgroundColor: '#8C4848', height: '32px', padding: '0 0.5rem' }}>
                                        <Trash2 size={16} />
                                    </Button>
                                    */}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                        <tr>
                            <td colSpan={5} className={styles.emptyState}>
                                {searchTerm ? 'Nenašli sa žiadne výsledky.' : 'Žiadni užívatelia.'}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
