import { BookingWizard } from '@/components/cosmetics/BookingWizard';

export default async function BookingPage({
    searchParams,
}: {
    searchParams: { serviceId?: string }
}) {
    // Next.js 15+ searchParams is async, but this looks like Next 14/15 interop or standard server component usage.
    // If using strict Next 15, we await it. If older, it's just props.
    // Assuming standard Next.js App Router pattern:
    const { serviceId } = await searchParams;

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: 'serif', fontSize: '2.5rem', color: '#333' }}>
                Rezervácia termínu
            </h1>
            <BookingWizard initialServiceId={serviceId} />
        </div>
    );
}
