import { getAppointments, getEmployees } from '@/actions/cosmetic-actions';
import { WeeklyScheduler } from '@/components/cosmetics/WeeklyScheduler';

export default async function CalendarPage() {
    const appointments = await getAppointments();
    const employees = await getEmployees(); // Need employees for legend/filtering later

    return (
        <div style={{ padding: '0' }}>
            <h1 style={{ marginBottom: '1.5rem', fontSize: '2rem', fontFamily: "var(--font-heading)", color: '#93745F' }}>Kalendár služieb</h1>
            <WeeklyScheduler
                initialAppointments={appointments as any}
                employees={employees as any}
            />
        </div>
    );
}
