import { getEmployeeAvailability } from '@/actions/cosmetic-actions';
import { AvailabilityManager } from '@/components/cosmetics/AvailabilityManager';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function MyAvailabilityPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Find employee ID
    const { data: emp } = await supabase.from('employees').select('id').eq('profile_id', user?.id).single();

    if (!emp) {
        return <div>Employee record not found.</div>;
    }

    const availability = await getEmployeeAvailability(emp.id);

    return (
        <div>


            <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontFamily: "var(--font-heading)", color: '#93745F' }}>Moja dostupnosť</h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>Nastavte si svoje bežné pracovné hodiny.</p>

            <AvailabilityManager
                employeeId={emp.id}
                initialAvailability={availability as any}
            />
        </div>
    );
}
