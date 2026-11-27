'use server';

import { redirect } from 'next/navigation';
import { setNewsletterSubscription } from '@/utils/newsletter-subscription';

export async function unsubscribeFormAction(formData: FormData) {
    const u = String(formData.get('u') || '');
    const t = String(formData.get('t') || '');
    const subscribed = formData.get('subscribe') === '1';
    const res = await setNewsletterSubscription(u, t, subscribed);
    const state = 'error' in res ? 'chyba' : subscribed ? 'prihlasene' : 'odhlasene';
    redirect(`/odhlasenie?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}&stav=${state}`);
}
