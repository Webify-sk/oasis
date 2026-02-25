import { redirect } from 'next/navigation';

export default async function BookingPage(props: any) {
    const searchParams = props.searchParams ? await props.searchParams : {};
    const serviceId = searchParams?.serviceId;

    if (serviceId) {
        redirect(`/dashboard/cosmetics?serviceId=${serviceId}`);
    } else {
        redirect('/dashboard/cosmetics');
    }
}
