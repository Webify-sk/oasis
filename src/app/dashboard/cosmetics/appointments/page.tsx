import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ClientAppointmentsList } from '@/components/cosmetics/ClientAppointmentsList';
import { ManualReservationModal } from '@/components/cosmetics/ManualReservationModal';

export default async function MyAppointmentsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    let appointments = [];
    let isEmployeeView = false;

    if (profile?.role === 'employee' || profile?.role === 'admin') {
        const { getEmployeeAppointments } = await import('@/actions/cosmetic-actions');
        appointments = await getEmployeeAppointments();
        isEmployeeView = true;
    } else {
        const { getUserAppointments } = await import('@/actions/cosmetic-actions');
        appointments = await getUserAppointments();
    }



    return (
        <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontFamily: "var(--font-heading)", color: '#93745F', margin: 0 }}>Nadchádzajúce rezervácie</h1>
                {isEmployeeView && <ManualReservationModal />}
            </div>
            <ClientAppointmentsList initialAppointments={appointments} isEmployeeView={isEmployeeView} />
        </div>
    );
}
