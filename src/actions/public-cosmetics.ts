'use server'

import { unstable_noStore as noStore } from 'next/cache';
import {
    getAvailableSlotsAnyEmployee,
    getAvailableDaysInMonthAnyEmployee
} from '@/actions/cosmetic-actions';

export interface PublicServiceInfo {
    id: string;
    title: string;
    duration_minutes: number;
}

function adminClientPromise() {
    return import('@supabase/supabase-js').then(({ createClient }) =>
        createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        )
    );
}

/**
 * Public calendar data. Everything here is reachable without a session, so it must
 * expose availability only — never who booked what.
 */
export async function getPublicServiceInfo(serviceId: string): Promise<PublicServiceInfo | null> {
    if (!serviceId) return null;

    const supabase = await adminClientPromise();
    const { data } = await supabase
        .from('cosmetic_services')
        .select('id, title, duration_minutes, is_active')
        .eq('id', serviceId)
        .single();

    if (!data || !data.is_active) return null;

    return { id: data.id, title: data.title, duration_minutes: data.duration_minutes };
}

/** Days in the given month that still have at least one free slot, across all staff. */
export async function getPublicAvailableDays(serviceId: string, year: number, month: number): Promise<string[]> {
    noStore();
    const service = await getPublicServiceInfo(serviceId);
    if (!service) return [];

    // 'any' is ignored by the aggregating action, it merges every employee who does the service.
    return getAvailableDaysInMonthAnyEmployee('any', serviceId, year, month);
}

/** Free start times for one day, across all staff, already filtered for today's past hours. */
export async function getPublicSlots(serviceId: string, date: string): Promise<string[]> {
    noStore();
    const service = await getPublicServiceInfo(serviceId);
    if (!service) return [];

    const slots = await getAvailableSlotsAnyEmployee('any', serviceId, date);

    // Drop times that already passed when the visitor is looking at today. Compare in
    // Bratislava time — the server runs in UTC, so a plain local comparison would be off.
    const { formatInTimeZone } = await import('date-fns-tz');
    const now = new Date();
    const todayStr = formatInTimeZone(now, 'Europe/Bratislava', 'yyyy-MM-dd');
    if (date !== todayStr) return slots;

    const nowStr = formatInTimeZone(now, 'Europe/Bratislava', 'HH:mm');
    return slots.filter(t => t > nowStr);
}
