import { NextRequest, NextResponse } from 'next/server';
import { setNewsletterSubscription } from '@/utils/newsletter-subscription';

// One-click unsubscribe (RFC 8058). Gmail, Outlook and Apple Mail show their own
// "Unsubscribe" button next to the sender and call this address with a POST when
// the List-Unsubscribe headers are present. No login, no confirmation page.
export async function POST(request: NextRequest) {
    const u = request.nextUrl.searchParams.get('u') || '';
    const t = request.nextUrl.searchParams.get('t') || '';

    const res = await setNewsletterSubscription(u, t, false);
    if ('error' in res) {
        return NextResponse.json({ ok: false }, { status: res.error === 'invalid' ? 400 : 500 });
    }
    return NextResponse.json({ ok: true });
}

// A person who opens the address in a browser gets the confirmation page instead.
export async function GET(request: NextRequest) {
    const target = new URL('/odhlasenie', request.url);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target);
}
