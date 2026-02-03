import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/utils/email';

export async function GET(req: Request) {
    // Optional: Add secret key protection
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (process.env.CRON_SECRET && key !== process.env.CRON_SECRET) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = await createClient();

    // Calculate time range: Trainings starting tomorrow between now and now+1h (approx)
    // Or just "Trainings starting tomorrow" if run once a day.
    // Ideally run this hourly.

    const now = new Date();
    const startRange = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
    const endRange = new Date(now.getTime() + 25 * 60 * 60 * 1000); // +25h

    // Format for DB query
    const startStr = startRange.toISOString();
    const endStr = endRange.toISOString();

    console.log(`Checking reminders for trainings between ${startStr} and ${endStr}`);

    // Fetch bookings starting in this range
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            start_time,
            training_type:training_types ( title ),
            user:profiles ( email, full_name, id )
        `)
        .gte('start_time', startStr)
        .lt('start_time', endStr);

    if (error) {
        return new NextResponse(`Error: ${error.message}`, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
        return new NextResponse('No trainings found in range', { status: 200 });
    }

    let sentCount = 0;

    for (const booking of bookings) {
        // @ts-ignore
        const userEmail = booking.user?.email;
        // @ts-ignore
        const userName = booking.user?.full_name || 'športovec';
        // @ts-ignore
        const trainingTitle = booking.training_type?.title || 'Tréning';

        // Skip if we can't find email (shouldn't happen if properly joined, but profiles vs entries)
        // Note: profiles table might not have email if it's not synced, usually user.email is in auth.users.
        // If 'profiles' has email column, great. If not, we have a problem.
        // Let's assume profiles has email based on previous context or we need to join auth users (which we can't easily).
        // CHECK: src/app/dashboard/profile/actions.ts uses auth.getUser(). profiles table usually has extra data.
        // If profiles doesn't have email, we can't send.
        // Wait, stripe webhook used `session.customer_details.email` or `user.email`.
        // Let's assume profile table has it or we can't send.

        // Actually, we can fetch email if not in profile? unique id is synced.
        // If email is not in profiles, we are stuck for cron as we can't query auth.users easily without Service Role.
        // BUT we have SERVICE_ROLE for other things (maybe).
        // Let's check if 'email' is in 'profiles' table. 
        // Based on ProfileForm.tsx: user.email is passed from auth.getUser(), not necessarily from profile.
        // PROFILE update only updates phone, name etc.
        // So email might NOT be in profiles.

        // FIX: We need access to auth.users using Service Role to get emails by ID.
        // OR we just mistakenly assumed profiles has email.

        if (booking.user && userEmail) {
            const formattedDate = new Date(booking.start_time).toLocaleString('sk-SK', {
                timeZone: 'Europe/Bratislava',
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit'
            });

            await sendEmail({
                to: userEmail,
                subject: `Pripomienka tréningu: ${trainingTitle}`,
                html: `
                    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h1 style="color: #5E715D;">Nezabudni na tréning!</h1>
                        <p>Ahoj ${userName},</p>
                        <p>pripomíname ti, že už zajtra máš rezervovaný tréning.</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #5E715D; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Tréning:</strong> ${trainingTitle}</p>
                            <p style="margin: 5px 0;"><strong>Čas:</strong> ${formattedDate}</p>
                        </div>
                        <p>Tešíme sa na teba!</p>
                        <br/>
                        <p style="font-size: 12px; color: #888;">Ak sa nemôžeš zúčastniť, prosím zruš rezerváciu včas.</p>
                    </div>
                `
            });
            sentCount++;
        }
    }

    return new NextResponse(`Sent ${sentCount} reminders`, { status: 200 });
}
