import { getEmployees } from '@/actions/cosmetic-actions';
import { StaffManager } from '@/components/cosmetics/StaffManager';

export default async function StaffPage() {
    const employees = await getEmployees();

    return <StaffManager initialEmployees={employees} />;
}
