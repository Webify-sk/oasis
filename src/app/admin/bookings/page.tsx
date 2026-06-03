import { createClient } from '@/utils/supabase/server';
import { requireEmployeeOrAdmin } from '@/utils/check-role';
import { getAdminScheduleData } from '@/utils/schedule-helpers';
import AdminBookingsManager from '@/components/admin/trainings/AdminBookingsManager';

export default async function AdminBookingsPage() {
    await requireEmployeeOrAdmin();
    const supabase = await createClient();

    // 1. Fetch upcoming bookings
    const { data: bookingsRaw } = await supabase
        .from('bookings')
        .select(`
            id,
            start_time,
            participants_count,
            training_type:training_types (
                id,
                title,
                level
            ),
            user:profiles!bookings_user_id_fkey (
                id,
                full_name,
                email,
                phone
            )
        `)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

    const bookings = (bookingsRaw as any) || [];

    const scheduleData = await getAdminScheduleData(supabase);

    return (
        <div style={{ padding: '0rem', width: '100%', minWidth: 0 }}>

            <AdminBookingsManager
                initialBookings={bookings}
                scheduleData={scheduleData}
            />
        </div>
    );
}
