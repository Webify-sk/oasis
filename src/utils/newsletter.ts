import { createHmac, timingSafeEqual } from 'crypto';

// The unsubscribe link must work without logging in, so it carries a signature
// instead of a session: HMAC of the user id. Nobody can unsubscribe someone else
// by guessing ids. A dedicated secret is optional; the service role key is always
// present on the server and never leaves it.
function secret() {
    const s = process.env.NEWSLETTER_UNSUB_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!s) throw new Error('Missing NEWSLETTER_UNSUB_SECRET / SUPABASE_SERVICE_ROLE_KEY');
    return s;
}

export function unsubscribeToken(userId: string) {
    return createHmac('sha256', secret()).update(`newsletter-unsub:${userId}`).digest('base64url');
}

export function verifyUnsubscribeToken(userId: string, token: string) {
    if (!userId || !token) return false;
    const expected = Buffer.from(unsubscribeToken(userId));
    const given = Buffer.from(token);
    return expected.length === given.length && timingSafeEqual(expected, given);
}

export function siteBaseUrl() {
    return (process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk').replace(/\/$/, '');
}

// Page a person lands on from the footer link (asks for confirmation).
export function unsubscribePageUrl(userId: string) {
    return `${siteBaseUrl()}/odhlasenie?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}

// Endpoint mail clients call for the one-click "Unsubscribe" button (RFC 8058).
export function unsubscribeOneClickUrl(userId: string) {
    return `${siteBaseUrl()}/api/newsletter/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}

// Plain-text alternative of an HTML body. Mails that are HTML-only score worse
// with spam filters.
export function htmlToText(html: string) {
    return html
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
        .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
            const text = String(label).replace(/<[^>]*>/g, '').trim();
            return text && text !== href ? `${text} (${href})` : href;
        })
        .replace(/<li\b[^>]*>/gi, '- ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|ul|ol|tr)>/gi, '\n\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&copy;/g, '(c)')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
