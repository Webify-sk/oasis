
import { createClient } from '@/utils/supabase/server';
import { ServiceForm } from '@/components/cosmetics/ServiceForm';
import { notFound } from 'next/navigation';

export default async function EditServicePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();

    const { data: service } = await supabase
        .from('cosmetic_services')
        .select('*')
        .eq('id', params.id)
        .single();

    if (!service) {
        notFound();
    }

    return <ServiceForm initialData={service} />;
}
