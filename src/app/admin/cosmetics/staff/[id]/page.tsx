
import { createClient } from '@/utils/supabase/server';
import { StaffForm } from '@/components/cosmetics/StaffForm';
import { notFound } from 'next/navigation';

export default async function EditStaffPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();

    const { data: employee } = await supabase
        .from('employees')
        .select('*')
        .eq('id', params.id)
        .single();

    if (!employee) {
        notFound();
    }

    return <StaffForm initialData={employee} />;
}
