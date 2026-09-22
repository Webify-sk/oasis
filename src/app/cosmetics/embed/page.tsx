import { getPublicServiceInfo } from '@/actions/public-cosmetics';
import { PublicCosmeticsCalendar } from '@/components/public/PublicCosmeticsCalendar';

// Availability changes with every booking — never serve this from a cache.
export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CosmeticsEmbedPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const raw = params.sluzba ?? params.service; // 'service' kept as an alias
    const serviceId = typeof raw === 'string' ? raw : undefined;

    const service = serviceId ? await getPublicServiceInfo(serviceId) : null;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk';

    return (
        <>
            {/* The embed sits inside the client's own page — let their background show through. */}
            <style>{`html, body { background: transparent !important; margin: 0; }`}</style>
            <div style={{ padding: '0.75rem', maxWidth: '900px', margin: '0 auto' }}>
                {service ? (
                    <PublicCosmeticsCalendar service={service} baseUrl={baseUrl} />
                ) : (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 1rem', margin: 0 }}>
                        Kalendár termínov sa nepodarilo načítať — procedúra nebola nájdená.
                    </p>
                )}
            </div>
        </>
    );
}
