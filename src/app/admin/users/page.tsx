import { createClient } from '@/utils/supabase/server';
import { UserList } from '@/components/admin/UserList';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import styles from '@/components/ui/Button.module.css';

export default async function AdminUsersPage() {
    const supabase = await createClient();

    // Fetch all profiles
    const { data: usersData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    // Fetch all active credit batches
    const { data: activeBatches } = await supabase
        .from('credit_batches')
        .select('user_id, remaining_amount, expires_at')
        .gt('remaining_amount', 0)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

    const batchesMap = new Map<string, number>();
    if (activeBatches) {
        for (const batch of activeBatches) {
            batchesMap.set(
                batch.user_id,
                (batchesMap.get(batch.user_id) || 0) + Number(batch.remaining_amount)
            );
        }
    }

    const users = usersData?.map(user => ({
        ...user,
        credits: batchesMap.get(user.id) || 0
    }));

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", display: 'flex', alignItems: 'center', gap: '1rem', color: '#93745F' }}>
                    Užívatelia
                    <span style={{ fontSize: '1.2rem', backgroundColor: '#f3f4f6', padding: '0.2rem 0.8rem', borderRadius: '999px', color: '#6b7280', fontFamily: 'var(--font-geist-sans)' }}>
                        {users?.length || 0}
                    </span>
                </h1>

                <Link
                    href="/admin/users/new"
                    className={clsx(styles.button, styles.primary, styles.md)}
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <Plus size={18} style={{ marginRight: '0.5rem' }} />
                    PRIDAŤ UŽÍVATEĽA
                </Link>
            </div>

            <div style={{ padding: '0 2rem' }}>
                <UserList users={users || []} />
            </div>
        </div>
    );
}
