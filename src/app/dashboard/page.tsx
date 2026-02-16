import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Calendar, CreditCard, History, User, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import styles from './dashboard.module.css';

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/');
    }

    // Parallel data fetching for performance
    const [profileRes, bookingsRes, appointmentsRes, pastTrainingsRes, pastAppointmentsRes] = await Promise.all([
        supabase
            .from('profiles')
            .select('full_name, credits, role, email_verified')
            .eq('id', user.id)
            .single(),
        supabase
            .from('bookings')
            .select(`
                *,
                training_types (
                    title,
                    description
                )
            `)
            .eq('user_id', user.id)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(1)
            .single(),
        supabase
            .from('cosmetic_appointments')
            .select(`
                *,
                cosmetic_services (
                    title,
                    duration_minutes
                )
            `)
            .eq('user_id', user.id)
            .neq('status', 'cancelled')
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(1)
            .single(),
        // Stats: Past Trainings
        supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .lt('start_time', new Date().toISOString()),
        // Stats: Past Procedures
        supabase
            .from('cosmetic_appointments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .neq('status', 'cancelled')
            .lt('start_time', new Date().toISOString())
    ]);

    const profile = profileRes.data;
    const nextBooking = bookingsRes.data;
    const nextAppointment = appointmentsRes.data;
    const totalTrainings = pastTrainingsRes.count || 0;
    const totalProcedures = pastAppointmentsRes.count || 0;

    const isVerified = profile?.email_verified === true;

    // Check if Employee or Admin
    if (profile?.role === 'employee' || profile?.role === 'admin') {
        const { getEmployeeAppointments, getManagedServices } = await import('@/actions/cosmetic-actions');
        const appointments = await getEmployeeAppointments();
        const services = await getManagedServices();
        const { EmployeeDashboard } = await import('@/components/dashboard/EmployeeDashboard'); // Dynamic import to avoid strict dependency loop if any
        return <EmployeeDashboard appointments={appointments} employeeName={profile.full_name || 'Kolega'} activeServicesCount={services.length} />;
    }

    // Helper to format date nicely
    const formatBookingDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return {
            time: d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
            date: d.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
            relative: getRelativeTime(d)
        };
    };

    function getRelativeTime(date: Date) {
        const now = new Date();
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Dnes';
        if (diffDays === 1) return 'Zajtra';
        return `O ${diffDays} dni`;
    }

    const nextSession = nextBooking ? formatBookingDate(nextBooking.start_time) : null;
    const nextProcedure = nextAppointment ? formatBookingDate(nextAppointment.start_time) : null;

    return (
        <div className={`${styles.container} animate-fadeInUp`}>

            {/* Header Section (Welcome + Credits) */}
            <div className={styles.headerContainer}>
                <div className={styles.welcomeSection}>
                    <h1 className={styles.welcomeTitle}>
                        Vitajte späť, {profile?.full_name?.split(' ')[0] || 'Oasis Member'}
                    </h1>
                    <p className={styles.welcomeSubtitle}>
                        Váš priestor pre zdravie a relax.
                    </p>
                </div>

                {/* Compact Credits Widget */}
                <div className={styles.headerCreditWidget}>
                    <div>
                        <div className={styles.headerCreditLabel}>Zostatok vstupov</div>
                        <div className={styles.headerCreditValue}>{profile?.credits || 0}</div>
                    </div>
                    <Link href={isVerified ? "/dashboard/credit" : "#"} aria-disabled={!isVerified}>
                        <Button
                            variant="secondary"
                            size="sm"
                            style={{ backgroundColor: '#F5F5F4', color: '#5E715D', border: '1px solid #E7E5E4', opacity: isVerified ? 1 : 0.5, cursor: isVerified ? 'pointer' : 'not-allowed' }}
                            disabled={!isVerified}
                            title={!isVerified ? "Overte svoj email pre dobitie kreditov" : ""}
                        >
                            <Plus size={16} />
                        </Button>
                    </Link>
                </div>
            </div>

            <div className={styles.grid}>

                {/* Hero Card: Next Training */}
                <div className={`${styles.card} ${styles.featureCard}`}>
                    <div className={styles.featureTitle}>
                        <Calendar size={14} style={{ display: 'inline', marginRight: '8px' }} />
                        NAJBLIŽŠÍ TRÉNING
                    </div>

                    {nextBooking ? (
                        <>
                            <div className={styles.sessionInfo}>
                                <span className={styles.sessionTime}>{nextSession?.time}</span>
                                <span className={styles.sessionDate}>
                                    {nextSession?.relative} • {nextSession?.date}
                                </span>
                                <div className={styles.sessionDetails}>
                                    <span>{nextBooking.training_types?.title}</span>
                                </div>
                            </div>
                            <Link href={isVerified ? "/dashboard/trainings" : "#"} aria-disabled={!isVerified}>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    style={{ backgroundColor: '#fff', color: '#8C7568', border: 'none', opacity: isVerified ? 1 : 0.7, cursor: isVerified ? 'pointer' : 'not-allowed' }}
                                    disabled={!isVerified}
                                >
                                    Zobraziť detaily <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                                </Button>
                            </Link>
                        </>
                    ) : (
                        <>
                            <div className={styles.sessionInfo}>
                                <span className={styles.sessionTime} style={{ fontSize: '1.5rem' }}>Žiadny tréning</span>
                                <span className={styles.sessionDate} style={{ marginTop: '0.5rem', display: 'block' }}>
                                    Čas na pohyb?
                                </span>
                            </div>
                            <Link href={isVerified ? "/dashboard/trainings" : "#"} aria-disabled={!isVerified}>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    style={{ backgroundColor: '#fff', color: '#8C7568', border: 'none', opacity: isVerified ? 1 : 0.7, cursor: isVerified ? 'pointer' : 'not-allowed' }}
                                    disabled={!isVerified}
                                    title={!isVerified ? "Overte svoj email pre rezerváciu" : ""}
                                >
                                    Rezervovať tréning <Plus size={16} style={{ marginLeft: '8px' }} />
                                </Button>
                            </Link>
                        </>
                    )}
                </div>

                {/* Hero Card: Next Procedure */}
                <div className={`${styles.card} ${styles.procedureCard}`}>
                    <div className={styles.featureTitle}>
                        <Calendar size={14} style={{ display: 'inline', marginRight: '8px' }} />
                        NAJBLIŽŠIA PROCEDÚRA
                    </div>

                    {nextAppointment ? (
                        <>
                            <div className={styles.sessionInfo}>
                                <span className={styles.sessionTime}>{nextProcedure?.time}</span>
                                <span className={styles.sessionDate}>
                                    {nextProcedure?.relative} • {nextProcedure?.date}
                                </span>
                                <div className={styles.sessionDetails}>
                                    <span>{nextAppointment.cosmetic_services?.title}</span>
                                </div>
                            </div>
                            <Link href={isVerified ? "/dashboard/cosmetics/appointments" : "#"} aria-disabled={!isVerified}>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    style={{ backgroundColor: '#fff', color: '#5E715D', border: 'none', opacity: isVerified ? 1 : 0.7, cursor: isVerified ? 'pointer' : 'not-allowed' }}
                                    disabled={!isVerified}
                                >
                                    Spravovať <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                                </Button>
                            </Link>
                        </>
                    ) : (
                        <>
                            <div className={styles.sessionInfo}>
                                <span className={styles.sessionTime} style={{ fontSize: '1.5rem' }}>Žiadna procedúra</span>
                                <span className={styles.sessionDate} style={{ marginTop: '0.5rem', display: 'block' }}>
                                    Doprajte si relax.
                                </span>
                            </div>
                            <Link href={isVerified ? "/dashboard/cosmetics" : "#"} aria-disabled={!isVerified}>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    style={{ backgroundColor: '#fff', color: '#5E715D', border: 'none', opacity: isVerified ? 1 : 0.7, cursor: isVerified ? 'pointer' : 'not-allowed' }}
                                    disabled={!isVerified}
                                    title={!isVerified ? "Overte svoj email pre rezerváciu" : ""}
                                >
                                    Rezervovať <Plus size={16} style={{ marginLeft: '8px' }} />
                                </Button>
                            </Link>
                        </>
                    )}
                </div>

            </div>


            {/* Quick Stats Card - Full Width */}
            <div className={`${styles.card} ${styles.quickStatsCard}`}>
                <div className={`${styles.featureTitle} ${styles.quickStatsTitle}`}>
                    <History size={14} style={{ display: 'inline', marginRight: '8px' }} />
                    Rýchle štatistiky
                </div>

                <div className={styles.quickStatsContent}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: '#F5F5F4', color: '#8C7568',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <User size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', color: '#4A403A', lineHeight: 1 }}>
                                {totalTrainings}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>Tréningy</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: '#F0FDF4', color: '#5E715D',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Calendar size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', color: '#4A403A', lineHeight: 1 }}>
                                {totalProcedures}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>Procedúry</div>
                        </div>
                    </div>
                </div>

                <div className={styles.quickStatsQuote}>
                    <div style={{ fontSize: '0.9rem', color: '#888', fontStyle: 'italic' }}>
                        "Zdravie je bohatstvo."
                    </div>
                </div>
            </div>
        </div >
    );
}
