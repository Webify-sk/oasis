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
    const [profileRes, bookingsRes, appointmentsRes] = await Promise.all([
        supabase
            .from('profiles')
            .select('full_name, credits, role')
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
            .single()
    ]);

    const profile = profileRes.data;
    const nextBooking = bookingsRes.data;
    const nextAppointment = appointmentsRes.data;

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
            time: d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }),
            date: d.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' }),
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

            {/* Welcome Section */}
            <div className={styles.welcomeSection}>
                <h1 className={styles.welcomeTitle}>
                    Vitajte späť, {profile?.full_name?.split(' ')[0] || 'Oasis Member'}
                </h1>
                <p className={styles.welcomeSubtitle}>
                    Váš priestor pre zdravie a relax.
                </p>
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
                            <Link href="/dashboard/trainings">
                                <Button variant="secondary" size="sm" style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>
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
                            <Link href="/dashboard/trainings">
                                <Button variant="secondary" size="sm" style={{ backgroundColor: '#fff', color: '#8C7568', border: 'none' }}>
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
                            <Link href="/dashboard/cosmetics/appointments">
                                <Button variant="secondary" size="sm" style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>
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
                            <Link href="/dashboard/cosmetics">
                                <Button variant="secondary" size="sm" style={{ backgroundColor: '#fff', color: '#5E715D', border: 'none' }}>
                                    Rezervovať <Plus size={16} style={{ marginLeft: '8px' }} />
                                </Button>
                            </Link>
                        </>
                    )}
                </div>

                {/* Credits Card */}
                <div className={`${styles.card} ${styles.creditCard}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={styles.creditLabel}>Zostatok vstupov</span>
                        <CreditCard size={20} color="#8C7568" />
                    </div>
                    <div className={styles.creditValue}>
                        {profile?.credits || 0}
                    </div>
                    <Link href="/dashboard/credit">
                        <Button variant="outline" size="sm" style={{ width: '100%' }}>
                            Dobiť vstupy
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.actionsGrid}>
                <Link href="/dashboard/trainings" className={styles.actionButton}>
                    <Calendar size={28} className={styles.actionIcon} />
                    <span className={styles.actionLabel}>Rozvrh Tréningov</span>
                </Link>

                <Link href="/dashboard/milestones" className={styles.actionButton}> {/* Assuming milestones/history is here */}
                    <History size={28} className={styles.actionIcon} />
                    <span className={styles.actionLabel}>Moja História</span>
                </Link>

                <Link href="/dashboard/profile" className={styles.actionButton}>
                    <User size={28} className={styles.actionIcon} />
                    <span className={styles.actionLabel}>Váš Profil</span>
                </Link>
            </div>

            {/* Daily Quote */}
            <div className={styles.quoteSection}>
                "Pohyb je oslavou toho, čo tvoje telo dokáže."
            </div>
        </div>
    );
}
