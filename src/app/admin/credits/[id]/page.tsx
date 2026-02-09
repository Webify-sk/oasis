import { getCreditPackage } from '@/app/admin/credits/actions';
import { CreditPackageForm } from '@/components/admin/CreditPackageForm';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditCreditPackagePage({ params }: Props) {
    const { id } = await params;
    const creditPackage = await getCreditPackage(id);

    if (!creditPackage) {
        notFound();
    }

    return (
        <div style={{ padding: '2rem' }}>
            <CreditPackageForm initialData={creditPackage} />
        </div>
    );
}
