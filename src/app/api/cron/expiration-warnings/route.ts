import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/utils/email';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // 1. Security Check (rovnaký kľúč ako pri tréningoch)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = await createClient();

    // 2. Časové okno - hľadáme expirácie medzi (o 6 dní) až (o 8 dní)
    // Týmto zachytíme všetky, ktorým platnosť vyprší presne "o týždeň" s dostatočne veľkou toleranciou cyklu pingu.
    const now = new Date();
    const startWindow = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString();
    const endWindow = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();

    // 3. Získanie dávok
    const { data: batches, error } = await supabase
        .from('credit_batches')
        .select(`
            id,
            remaining_amount,
            expires_at,
            profile:profiles (email, full_name, id)
        `)
        .gte('expires_at', startWindow)
        .lt('expires_at', endWindow)
        .gt('remaining_amount', 0)
        .eq('warning_sent', false);

    if (error) {
        console.error('Error fetching credit batches for expiration reminder:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!batches || batches.length === 0) {
        return NextResponse.json({ message: 'No expiring batches to warn about', count: 0 });
    }

    // 4. Odosielanie emailov
    let sentCount = 0;
    let failedCount = 0;

    for (const batch of batches) {
        const profile = batch.profile as any;
        
        if (!profile?.email) {
            console.log(`Skipping batch ${batch.id}: No email in profile ${profile?.id}`);
            continue;
        }

        const expireDate = new Date(batch.expires_at).toLocaleDateString('sk-SK', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const remaining = Number(batch.remaining_amount);
        const vstupSlang = remaining === 1 ? 'vstup' : (remaining >= 2 && remaining <= 4 ? 'vstupy' : 'vstupov');

        const subject = `Upozornenie: Blížiaca sa expirácia Vašich vstupov`;
        const html = `
            <div style="font-family: sans-serif; color: #333;">
                <h1>Dobrý deň ${profile.full_name || 'športovec'},</h1>
                <p>Radi by sme Vás priateľsky upozornili na blížiacu sa expiráciu platnosti Vašich nevyužitých vstupov v Oasis Lounge.</p>
                <div style="background: #fdf4ea; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Zostávajúci počet:</strong> ${remaining} ${vstupSlang}</p>
                    <p><strong>Dátum expirácie:</strong> ${expireDate}</p>
                </div>
                <p>Nezabudnite si ich vyčerpať a rezerváciou predtým ako prepadnú!</p>
                <div style="text-align: center; margin-top: 20px;">
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk'}/dashboard/trainings" 
                       style="background-color: #5E715D; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                       Zarezervovať si tréning
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
            // 5. Označíme, že varovanie už bolo odoslané
            await supabase
                .from('credit_batches')
                .update({ warning_sent: true })
                .eq('id', batch.id);
                
            sentCount++;
        } else {
            failedCount++;
        }
    }

    return NextResponse.json({
        message: 'Processed expiration warnings',
        sent: sentCount,
        failed: failedCount,
        totalFound: batches.length
    });
}
