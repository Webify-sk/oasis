import { VacationManager } from '@/components/admin/VacationManager';

export default function AdminVacationsPage() {
    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{
                fontSize: '2.5rem',
                fontWeight: 'normal',
                fontFamily: "var(--font-heading)",
                color: '#93745F',
                marginBottom: '2rem'
            }}>
                Dovolenky a voľno
            </h1>

            <div style={{ maxWidth: '800px' }}>
                <VacationManager />
            </div>
        </div>
    );
}
