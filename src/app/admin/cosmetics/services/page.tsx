import { getCosmeticServices } from '@/actions/cosmetic-actions';
import { ServiceManager } from '@/components/cosmetics/ServiceManager';

export default async function ServicesPage() {
    const services = await getCosmeticServices();

    return <ServiceManager initialServices={services} />;
}
