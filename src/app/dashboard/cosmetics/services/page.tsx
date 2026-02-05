import { getManagedServices } from '@/actions/cosmetic-actions';
import { ServiceManager } from '@/components/cosmetics/ServiceManager';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ServicesDashboardPage() {
    const services = await getManagedServices();

    return (
        <div>


            <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontFamily: 'serif', color: '#333' }}>Správa Procedúr</h1>

            <ServiceManager initialServices={services} />
        </div>
    );
}
