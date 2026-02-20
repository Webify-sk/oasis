import { createClient } from '@/utils/supabase/server';
import { CouponForm } from '@/components/admin/CouponForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function AdminNewCouponPage() {
    const supabase = await createClient();

    // Fetch users (profiles) to allow selection
    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

    // Fetch training types
    const { data: trainings } = await supabase
        .from('training_types')
        .select('id, title')
        .order('title');

    // Fetch confirmed bookings
    const { data: bookings } = await supabase
        .from('bookings')
        .select('user_id, training_type_id')
        .eq('status', 'confirmed');

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem'
            }}>
                <Link
                    href="/admin/coupons"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        textDecoration: 'none',
                        color: '#6b7280',
                        marginRight: '1rem',
                        transition: 'color 0.2s',
                    }}
                >
                    <ArrowLeft size={20} style={{ marginRight: '0.5rem' }} />
                    Späť
                </Link>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", color: '#93745F', margin: 0 }}>
                    Vygenerovať kupóny
                </h1>
            </div>

            <div style={{ padding: '0 2rem' }}>
                <CouponForm
                    users={users || []}
                    trainings={trainings || []}
                    bookings={bookings || []}
                />
            </div>
        </div>
    );
}
