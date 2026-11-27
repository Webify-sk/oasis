import { createAdminClient } from '@/utils/supabase/admin';
import { verifyUnsubscribeToken } from '@/utils/newsletter';

// The person is not logged in when unsubscribing; the signed token in the link is
// the proof. Hence the service role, limited to exactly these two columns.
// Server-only helper (not a server action): callers are the unsubscribe page and
// the one-click endpoint.
export async function setNewsletterSubscription(userId: string, token: string, subscribed: boolean) {
    if (!verifyUnsubscribeToken(userId, token)) return { error: 'invalid' as const };

    const { error } = await createAdminClient()
        .from('profiles')
        .update({
            newsletter_subscribed: subscribed,
            newsletter_unsubscribed_at: subscribed ? null : new Date().toISOString(),
        })
        .eq('id', userId);

    if (error) {
        console.error('Newsletter subscription update failed:', error);
        return { error: 'failed' as const };
    }
    return { success: true as const };
}
