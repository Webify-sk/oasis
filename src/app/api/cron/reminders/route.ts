import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/utils/email';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // 1. Security Check
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = await createClient();

    // 2. Calculate time range
    // We want to notify for trainings starting in ~24 hours.
    // Let's pick a window: [NOW + 23h, NOW + 25h] to catch anything in that slot.
    // Or simpler: >= NOW + 23h AND < NOW + 25h AND reminder_sent = false

    // Postgres interval syntax is robust, but let's use JS dates for query parameters to be explicit.
    const now = new Date();
    const startWindow = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const endWindow = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    // 3. Fetch bookings
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            start_time,
            user_id,
            training_type:training_types (title),
            profile:profiles (email, full_name, id)
        `)
        .gte('start_time', startWindow)
        .lt('start_time', endWindow)
        .eq('reminder_sent', false);

    if (error) {
        console.error('Error fetching bookings for reminder:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
        return NextResponse.json({ message: 'No bookings to remind', count: 0 });
    }

    // 4. Send Emails
    let sentCount = 0;
    let failedCount = 0;

    for (const booking of bookings) {
        // Safe casting/checking
        const profile = booking.profile as any;
        const trainingTitle = (booking.training_type as any)?.title || 'Tréning';

        if (!profile?.email) {
            console.log(`Skipping booking ${booking.id}: No email`);
            continue;
        }

        const startTime = new Date(booking.start_time).toLocaleString('sk-SK', {
            timeZone: 'Europe/Bratislava',
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        });

        const subject = `Pripomienka: Zajtrajší tréning ${trainingTitle}`;
        const html = `
            <div style="font-family: sans-serif; color: #333;">
                <h1>Dobrý deň ${profile.full_name || 'športovec'},</h1>
                <p>Pripomíname Vám Váš zajtrajší tréning v Oasis Lounge.</p>
                <div style="background: #fdf4ea; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Tréning:</strong> ${trainingTitle}</p>
                    <p><strong>Čas:</strong> ${startTime}</p>
                </div>
                <p>Tešíme sa na Vás!</p>
                <p style="font-size: 0.8rem; color: #666; margin-top: 30px;">
                    Ak sa nemôžete zúčastniť, prosíme, odhláste sa včas cez náš portál, aby Vám neprepadol vstup.
                </p>
                <div style="text-align: center; margin-top: 20px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/trainings" 
                       style="background-color: #5E715D; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                       Spravovať rezervácie
                    </a>
                </div>
            </div>
        `;

        const { success } = await sendEmail({
            to: profile.email,
            subject,
            html
        });

        if (success) {
            // 5. Update reminder_sent flag
            await supabase
                .from('bookings')
                .update({ reminder_sent: true })
                .eq('id', booking.id);
            sentCount++;
        } else {
            failedCount++;
        }
    }

    return NextResponse.json({
        message: 'Processed reminders',
        sent: sentCount,
        failed: failedCount,
        totalFound: bookings.length
    });
}
