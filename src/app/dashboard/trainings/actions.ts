'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function bookTraining(trainingTypeId: string, startTimeISO: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Musíte byť prihlásený.' };
    }

    // Check Verification (Skip for staff)
    const { data: profileCheck } = await supabase
        .from('profiles')
        .select('email_verified, role')
        .eq('id', user.id)
        .single();

    const isStaff = profileCheck?.role === 'employee' || profileCheck?.role === 'admin';
    if (!isStaff && profileCheck?.email_verified === false) {
        return { success: false, message: 'Pre prihlásenie na tréning musíte mať overený email.' };
    }

    // Check if training is in the past
    const trainingDate = new Date(startTimeISO);
    const now = new Date();
    if (trainingDate < now) {
        return { success: false, message: 'Na tento tréning sa už nedá prihlásiť (termín uplynul).' };
    }

    // Check if training type exists and get capacity
    const { data: trainingType, error: typeError } = await supabase
        .from('training_types')
        .select('capacity, title, price_credits')
        .eq('id', trainingTypeId)
        .single();

    if (typeError || !trainingType) {
        return { success: false, message: 'Tréning sa nenašiel.' };
    }

    const priceCredits = trainingType.price_credits ?? 1;

    // Check existing occupancy for this specific time slot
    const { count: currentOccupancy, error: countError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('training_type_id', trainingTypeId)
        .eq('start_time', startTimeISO);

    if (countError) {
        return { success: false, message: 'Chyba pri overovaní kapacity.' };
    }

    if ((currentOccupancy || 0) >= trainingType.capacity) {
        return { success: false, message: 'Tréning je plne obsadený.' };
    }

    // Check if user already booked this slot
    const { data: existingBooking, error: existingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', user.id)
        .eq('training_type_id', trainingTypeId)
        .eq('start_time', startTimeISO)
        .single();

    if (existingBooking) {
        return { success: false, message: 'Na tento tréning ste už prihlásený.' };
    }

    // Check user credits
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        return { success: false, message: 'Chyba pri načítaní profilu.' };
    }

    // Only check credits if price > 0
    if (priceCredits > 0 && (profile.credits || 0) < priceCredits) {
        return { success: false, message: `Nemáte dostatok vstupov. Cena tréningu je ${priceCredits} kreditov.` };
    }

    // Insert booking
    const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
            user_id: user.id,
            training_type_id: trainingTypeId,
            start_time: startTimeISO
        });

    if (bookingError) {
        return { success: false, message: 'Chyba pri vytváraní rezervácie: ' + bookingError.message };
    }

    // Deduct credit only if price > 0
    if (priceCredits > 0) {
        const { error: creditError } = await supabase
            .from('profiles')
            .update({ credits: (profile.credits || 0) - priceCredits })
            .eq('id', user.id);

        if (creditError) {
            // Fallback: If credit update fails, ideally we should rollback booking.
            // For now logging error. A transaction via RPC would be safer.
            console.error('Failed to deduct credit', creditError);
        }
    }

    revalidatePath('/dashboard/trainings');
    revalidatePath('/admin/trainings'); // Refresh admin view too

    // Send Booking Confirmation Email
    try {
        const { sendEmail } = await import('@/utils/email');
        const { getEmailTemplate } = await import('@/utils/email-template');

        const formattedDate = new Date(startTimeISO).toLocaleString('sk-SK');
        const html = getEmailTemplate(
            'Potvrdenie rezervácie',
            `
            <p>Ahoj,</p>
            <p>úspešne sme rezervovali tvoje miesto na tréningu:</p>
            
            <div class="highlight-box">
                <p style="margin: 5px 0;"><strong>Tréning:</strong> ${trainingType.title}</p>
                <p style="margin: 5px 0;"><strong>Dátum a čas:</strong> ${formattedDate}</p>
            </div>
            
            <p>Tešíme sa na teba!</p>
            <div style="text-align: center; margin-top: 20px;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk'}/dashboard/trainings" class="button">Moje rezervácie</a>
            </div>
            `
        );

        await sendEmail({
            to: user.email || '',
            subject: 'Potvrdenie rezervácie tréningu',
            html: html
        });
    } catch (mailError) {
        console.error('Failed to send booking email:', mailError);
    }

    return { success: true, message: 'Úspešne ste sa prihlásili na tréning.' };
}

export async function cancelBooking(bookingId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: 'Musíte byť prihlásený.' };

    // 1. Fetch booking details *before* deletion to get start_time
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('start_time, training_type:training_type_id(title, price_credits)')
        .eq('id', bookingId)
        .eq('user_id', user.id)
        .single();

    if (fetchError || !booking) {
        return { success: false, message: 'Rezervácia sa nenašla.' };
    }

    const trainingTypeData = booking.training_type as any;
    const priceCredits = (Array.isArray(trainingTypeData) ? trainingTypeData[0]?.price_credits : trainingTypeData?.price_credits) ?? 1;

    // 2. Check 24h rule
    const startTime = new Date(booking.start_time);
    const now = new Date();
    const diffMs = startTime.getTime() - now.getTime();
    const hoursValues = diffMs / (1000 * 60 * 60);
    const shouldRefund = hoursValues >= 24;

    // 3. Delete booking
    const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

    if (deleteError) {
        console.error('Cancel error:', deleteError);
        return { success: false, message: 'Chyba pri rušení rezervácie: ' + deleteError.message };
    }

    // 4. Refund credit if eligible and price > 0
    if (shouldRefund && priceCredits > 0) {
        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
        if (profile) {
            await supabase
                .from('profiles')
                .update({ credits: (profile.credits || 0) + priceCredits })
                .eq('id', user.id);
        }
    }

    revalidatePath('/dashboard/trainings');
    revalidatePath('/admin/trainings');

    // 5. Send Cancellation Email
    try {
        const { sendEmail } = await import('@/utils/email');
        const { getEmailTemplate } = await import('@/utils/email-template');

        const refundMessage = shouldRefund
            ? (priceCredits > 0 ? `a ${priceCredits} kr. ti bolo vrátené na účet.` : 'tento tréning bol zadarmo.')
            : 'ale keďže je to menej ako 24h pred tréningom, <strong>vstup nebol vrátený</strong>.';

        const html = getEmailTemplate(
            'Zrušenie rezervácie',
            `
            <p>Ahoj,</p>
            <p>tvoja rezervácia na tréning <strong>${// @ts-ignore
            booking.training_type?.title || 'Tréning'}</strong> bola zrušená ${refundMessage}</p>
            <p>Dúfame, že si čoskoro nájdeš iný termín.</p>
            
            <div style="text-align: center; margin-top: 20px;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk'}/dashboard/trainings" class="button">Rezervovať nový termín</a>
            </div>
            `
        );

        await sendEmail({
            to: user.email || '',
            subject: 'Zrušenie rezervácie',
            html: html
        });
    } catch (mailError) {
        console.error('Failed to send cancellation email:', mailError);
    }

    return {
        success: true,
        message: shouldRefund ? 'Rezervácia zrušená, vstup bol vrátený.' : 'Rezervácia zrušená (bez vrátenia kreditu, < 24h).'
    };
}
