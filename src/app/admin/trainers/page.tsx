import { createClient } from '@/utils/supabase/server';
import { TrainerList } from '@/components/admin/TrainerList';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import styles from '@/components/ui/Button.module.css';

export default async function AdminTrainersPage() {
    const supabase = await createClient();

    // Fetch all trainers
    const { data: trainers, error } = await supabase
        .from('trainers')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", color: '#93745F' }}>Tréneri</h1>

                <Link
                    href="/admin/trainers/new"
                    className={clsx(styles.button, styles.primary, styles.md)}
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <Plus size={18} style={{ marginRight: '0.5rem' }} />
                    PRIDAŤ TRÉNERA
                </Link>
            </div>

            <div style={{ padding: '0 2rem' }}>
                <TrainerList trainers={trainers || []} />
            </div>
        </div>
    );
}
