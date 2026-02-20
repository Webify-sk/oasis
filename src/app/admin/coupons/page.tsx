import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import styles from '@/components/ui/Button.module.css';

// Components we will create
import { CouponList } from '@/components/admin/CouponList';

export default async function AdminCouponsPage() {
    const supabase = await createClient();

    // Fetch all coupons joined with profiles to see who they belong to and who created them
    const { data: coupons, error } = await supabase
        .from('discount_coupons')
        .select(`
            *,
            target_user:profiles!discount_coupons_target_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fetch coupons error:", error);
    }

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
                    Zľavové kupóny
                    <span style={{ fontSize: '1.2rem', backgroundColor: '#f3f4f6', padding: '0.2rem 0.8rem', borderRadius: '999px', color: '#6b7280', fontFamily: 'var(--font-geist-sans)' }}>
                        {coupons?.length || 0}
                    </span>
                </h1>

                <Link
                    href="/admin/coupons/new"
                    className={clsx(styles.button, styles.primary, styles.md)}
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <Plus size={18} style={{ marginRight: '0.5rem' }} />
                    VYGENEROVAŤ KUPÓNY
                </Link>
            </div>

            <div style={{ padding: '0 2rem' }}>
                <CouponList coupons={coupons || []} />
            </div>
        </div>
    );
}
