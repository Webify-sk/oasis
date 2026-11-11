import { Zap, Settings, Users, Calendar, Plus, Clock, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './cosmetics.module.css';
import { ServiceManager } from '@/components/cosmetics/ServiceManager';
import { BookingWizard } from '@/components/cosmetics/BookingWizard';

export default async function CosmeticsPage(props: any) {
    const searchParams = props.searchParams ? await props.searchParams : {};
    const serviceId = searchParams?.serviceId;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let isEmployeeOrAdmin = false;
    let activeServicesCount = 0;
    let todayCount = 0;
    let services: any[] = [];

    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        isEmployeeOrAdmin = profile?.role === 'employee' || profile?.role === 'admin';

        if (isEmployeeOrAdmin) {
            const { getManagedServices } = await import('@/actions/cosmetic-actions');
            services = await getManagedServices();
            activeServicesCount = services.length;

            // Today's appointments (Bratislava calendar day). An employee sees her own,
            // an admin without an employee record sees the whole salon.
            const { getRealUtcDate } = await import('@/utils/booking-logic');
            const { formatInTimeZone } = await import('date-fns-tz');
            const today = formatInTimeZone(new Date(), 'Europe/Bratislava', 'yyyy-MM-dd');
            const dayStart = getRealUtcDate(`${today}T00:00:00`);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

            const { data: ownEmployee } = await supabase
                .from('employees').select('id').eq('profile_id', user.id).maybeSingle();

            let todayQuery = supabase
                .from('cosmetic_appointments')
                .select('id', { count: 'exact', head: true })
                .neq('status', 'cancelled')
                .gte('start_time', dayStart.toISOString())
                .lt('start_time', dayEnd.toISOString());
            if (ownEmployee) todayQuery = todayQuery.eq('employee_id', ownEmployee.id);

            const { count } = await todayQuery;
            todayCount = count ?? 0;
        }
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Beauty & Body</p>
                    <h1 style={{ fontSize: '2.5rem', fontFamily: "var(--font-heading)", color: '#93745F', margin: 0 }}>
                        {isEmployeeOrAdmin ? 'Správa Kozmetiky' : 'Rezervácia termínu'}
                    </h1>
                </div>
            </div>

            {/* Stats Cards - Only for Employees/Admins */}
            {isEmployeeOrAdmin && (
                <>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '3rem'
                    }}>
                        <div style={{
                            padding: '1.5rem',
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                            border: '1px solid #eee'
                        }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#5E715D', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dnešné rezervácie</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2c3e50' }}>{todayCount}</div>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#95a5a6' }}>Prehľad dňa</p>
                        </div>

                        <div style={{
                            padding: '1.5rem',
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                            border: '1px solid #eee'
                        }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#5E715D', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aktívne služby</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2c3e50' }}>{activeServicesCount}</div>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#95a5a6' }}>Dostupné pre klientov</p>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.8rem', fontFamily: "var(--font-heading)", color: '#93745F', marginBottom: '1.5rem' }}>Moje služby</h2>
                        <ServiceManager initialServices={services} />
                    </div>
                </>
            )}

            {/* Client View: Booking Wizard */}
            {!isEmployeeOrAdmin && (
                <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '1rem' }}>
                    <BookingWizard initialServiceId={serviceId} />
                </div>
            )}
        </div>
    );
}
