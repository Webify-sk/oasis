import { getAdminCosmeticAppointments } from '@/actions/cosmetic-actions';
import { getManagedServices, getEmployees } from '@/actions/cosmetic-actions';
import AdminReservationsManager from '@/components/admin/cosmetics/AdminReservationsManager';
import { requireAdmin } from '@/utils/check-role';

export default async function AdminCosmeticsReservationsPage() {
    await requireAdmin();

    const appointments = await getAdminCosmeticAppointments();
    const services = await getManagedServices(); // Assuming admins get all
    const employees = await getEmployees();

    return (
        <div style={{ padding: '0rem', width: '100%', minWidth: 0 }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '1.5rem 1rem 0 1rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: "var(--font-heading)", display: 'flex', alignItems: 'center', gap: '1rem', color: '#93745F' }}>
                    Kozmetika - Rezervácie
                    <span style={{ fontSize: '1.2rem', backgroundColor: '#f3f4f6', padding: '0.2rem 0.8rem', borderRadius: '999px', color: '#6b7280', fontFamily: 'var(--font-geist-sans)' }}>
                        {appointments?.length || 0}
                    </span>
                </h1>
            </div>

            <AdminReservationsManager
                initialAppointments={appointments}
                services={services}
                employees={employees}
            />
        </div>
    );
}
