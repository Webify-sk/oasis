import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_TIMEOUT_MS = 5000

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Anonymný návštevník bez Supabase cookies -> netreba volať Supabase vôbec.
    // Zabráni to MIDDLEWARE_INVOCATION_TIMEOUT (504) pre bežných návštevníkov,
    // keď Supabase odpovedá pomaly.
    const hasSupabaseCookies = request.cookies
        .getAll()
        .some((c) => c.name.startsWith('sb-'))

    if (!hasSupabaseCookies) {
        if (request.nextUrl.pathname.startsWith('/dashboard')) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        return response
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: {
                maxAge: 30 * 24 * 60 * 60, // 30 days
            },
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Ak Supabase neodpovie včas, radšej pustíme požiadavku ďalej (fail-open),
    // než aby celý web spadol na 504. Chránený /dashboard sa presmeruje na úvod.
    let user = null
    try {
        const result = await Promise.race([
            supabase.auth.getUser(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('auth timeout')), AUTH_TIMEOUT_MS)
            ),
        ])
        user = result.data.user
    } catch {
        if (request.nextUrl.pathname.startsWith('/dashboard')) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        return response
    }

    if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return response
}
