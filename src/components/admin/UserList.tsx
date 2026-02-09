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

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead className={styles.thead}>
                        <tr>
                            <th className={styles.th}>Meno a priezvisko</th>
                            <th className={styles.th}>Email</th>
                            <th className={styles.th}>Telefón</th>
                            <th className={styles.th}>Rola</th>
                            <th className={styles.th}>Vstupy</th>
                            <th className={styles.th} style={{ width: '120px', textAlign: 'center' }}>Akcie</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className={styles.tr}>
                                <td className={styles.td}>{user.full_name || 'Nezadané'}</td>
                                <td className={styles.tdSecondary}>{user.email}</td>
                                <td className={styles.tdSecondary}>{user.phone || '-'}</td>
                                <td className={styles.tdSecondary}>
                                    <span style={{
                                        textTransform: 'capitalize',
                                        padding: '2px 8px',
                                        borderRadius: '99px',
                                        backgroundColor: user.role === 'admin' ? '#eef2ff' : user.role === 'employee' ? '#f0fdf4' : 'transparent',
                                        color: user.role === 'admin' ? '#4338ca' : user.role === 'employee' ? '#166534' : 'inherit',
                                        fontSize: '0.85rem'
                                    }}>
                                        {user.role === 'user' ? 'Klient' : (user.role || '-')}
                                    </span>
                                </td>
                                <td className={styles.tdSecondary}>{user.credits}</td>
                                <td className={styles.td} style={{ textAlign: 'center' }}>
                                    <div className={styles.actions} style={{ justifyContent: 'center' }}>
                                        <Link href={`/admin/users/${user.id}`} style={{ textDecoration: 'none' }} title="Zobraziť detail">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                style={{
                                                    fontSize: '0.75rem',
                                                    height: '32px',
                                                    backgroundColor: 'transparent',
                                                    border: '1px solid #E5E7EB',
                                                    color: '#4B5563',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    boxShadow: 'none',
                                                    padding: '0 0.75rem'
                                                }}
                                            >
                                                <Eye size={14} />
                                                Detail
                                            </Button>
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={6} className={styles.emptyState}>
                                    {searchTerm ? 'Nenašli sa žiadne výsledky.' : 'Žiadni užívatelia.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
