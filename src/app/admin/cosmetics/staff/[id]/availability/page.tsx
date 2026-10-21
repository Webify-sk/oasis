import { getEmployeeAvailability } from '@/actions/cosmetic-actions';
import { AvailabilityManager } from '@/components/cosmetics/AvailabilityManager';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { requireAdmin } from '@/utils/check-role';

export default async function AvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
    // Employees edit their own hours in the dashboard; this page takes any employee id.
    await requireAdmin();
    const { id } = await params;
    const availability = await getEmployeeAvailability(id);

    return (
        <div>
            <Link
                href="/admin/cosmetics/staff"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: '#666', textDecoration: 'none' }}
            >
                <ArrowLeft size={18} />
                Späť na zoznam
            </Link>

            <AvailabilityManager employeeId={id} initialAvailability={availability} />
        </div>
    );
}
