'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function bookTraining(trainingTypeId: string, startTimeISO: string, participantsCount: number = 1) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Musíte byť prihlásený.' };
    }

    // Fetch role
    const { data: profileCheck } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // Check if training is in the past
    const trainingDate = new Date(startTimeISO);
    const now = new Date();
    if (trainingDate < now) {
        return { success: false, message: 'Na tento tréning sa už nedá prihlásiť (termín uplynul).' };
    }

    // Check if training type exists and get capacity
    const { data: trainingType, error: typeError } = await supabase
        .from('training_types')
        .select('capacity, title, price_credits, schedule')
        .eq('id', trainingTypeId)
        .single();

    if (typeError || !trainingType) {
        return { success: false, message: 'Tréning sa nenašiel.' };
    }

    const priceCredits = trainingType.price_credits ?? 1;

    // Calculate total occupancy (sum of participants_count)
    const { data: slotBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('participants_count')
        .eq('training_type_id', trainingTypeId)
        .eq('start_time', startTimeISO);

    if (bookingsError) {
        return { success: false, message: 'Chyba pri overovaní kapacity.' };
    }

    const currentOccupancy = slotBookings?.reduce((sum, b) => sum + (b.participants_count || 1), 0) || 0;

    if (currentOccupancy + participantsCount > trainingType.capacity) {
        return { success: false, message: 'Na tréningu nie je dostatok voľných miest.' };
    }

    // Dynamic Booking Deadline Logic (Only if nobody is booked yet)
    if ((currentOccupancy || 0) === 0) {
        const { isBookingLocked } = await import('@/utils/booking-logic');
        const { isLocked, deadlineMsg } = isBookingLocked(startTimeISO);

        if (isLocked) {
            return {
                success: false,
                message: `Na tento tréning sa už nedá prihlásiť. (Deadline pre prázdne tréningy: ${deadlineMsg} vopred)`
            };
        }
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

    // Check user credits and unlimited status
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits, credits_expire_at, unlimited_expires_at')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        return { success: false, message: 'Chyba pri načítaní profilu.' };
    }

    const isUnlimited = profile.unlimited_expires_at && new Date(profile.unlimited_expires_at) > new Date();

    // Evaluate if normal credits are still valid
    const hasUnexpiredCredits = !profile.credits_expire_at || new Date(profile.credits_expire_at) >= new Date();
    const effectiveCredits = hasUnexpiredCredits ? (profile.credits || 0) : 0;

    // Only check credits if price > 0 AND not unlimited (Unlimited covers only the user, +1 needs credits? Or unlimited covers both? Assuming +1 always needs credits or simple multiplier)
    // Actually, usually Unlimited is for the user only. +1 implies paying for stored credits? 
    // Requirement: "Ak budu 2 tak automaticky odpočítať 2 vstupy (ked sa odhlási tak refundovatt 2 kredity)"
    // If user is Unlimited, they pay 0 for themselves. But for +1?
    // Let's assume:
    // If Unlimited: User is free, +1 costs 1 credit.
    // If Not Unlimited: User costs 1 credit, +1 costs 1 credit -> Total 2 credits.

    // However, simplicity first: "odpočítať 2 vstupy". 
    // If Unlimited user brings +1, should it take 1 credit from their credit balance? Probably yes.
    // Let's implement logic: Total Cost = (IsUnlimited ? 0 : 1) + (participantsCount - 1) * 1.
    // Wait, price_credits might be > 1.
    // Total Cost = (IsUnlimited ? 0 : priceCredits) + (participantsCount - 1) * priceCredits.

    const selfCost = isUnlimited ? 0 : priceCredits;
    const additionalCost = (participantsCount - 1) * priceCredits;
    const totalCost = selfCost + additionalCost;

    // FÁZA 2: Získanie aktívnych dávok kreditov (FIFO logika)
    let activeBatches: any[] = [];
    if (totalCost > 0) {
        const { data: batches, error: batchesError } = await supabase
            .from('credit_batches')
            .select('*')
            .eq('user_id', user.id)
            .gt('remaining_amount', 0)
            .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
            .order('expires_at', { ascending: true, nullsFirst: false });

        if (batchesError) {
            return { success: false, message: 'Chyba pri načítaní kreditných dávok.' };
        }
        
        activeBatches = batches || [];
        const totalAvailable = activeBatches.reduce((sum, b) => sum + Number(b.remaining_amount), 0);

        if (totalAvailable < totalCost) {
            return { success: false, message: `Nemáte dostatok platných vstupov. Celkovo dostupných: ${totalAvailable}, potrebných: ${totalCost}.` };
        }
    }

    // Resolve trainer_id from the schedule
    let resolvedTrainerId = null;
    if (trainingType.schedule && Array.isArray(trainingType.schedule)) {
        const dateObj = new Date(startTimeISO);
        const slovakDays = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
        const dayName = slovakDays[dateObj.getUTCDay()];
        const timeString = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;
        const dateString = startTimeISO.split('T')[0];

        const scheduleItem = trainingType.schedule.find((s: any) => {
            if (s.isRecurring !== false) {
                return s.day === dayName && s.time && s.time.startsWith(timeString);
            } else {
                return s.date === dateString && s.time && s.time.startsWith(timeString);
            }
        });

        if (scheduleItem?.trainer_id) {
            resolvedTrainerId = scheduleItem.trainer_id;
        }
    }

    // Insert booking
    const { data: newBookingParams, error: bookingError } = await supabase
        .from('bookings')
        .insert({
            user_id: user.id,
            training_type_id: trainingTypeId,
            start_time: startTimeISO,
            participants_count: participantsCount,
            trainer_id: resolvedTrainerId
        })
        .select('id')
        .single();

    if (bookingError || !newBookingParams) {
        return { success: false, message: 'Chyba pri vytváraní rezervácie: ' + (bookingError?.message || 'unknown') };
    }

    const newBookingId = newBookingParams.id;

    // FÁZA 2: FIFO Odpočet kreditov
    if (totalCost > 0) {
        let costToDeduct = totalCost;
        
        for (const batch of activeBatches) {
            if (costToDeduct <= 0) break;
            
            const availableInBatch = Number(batch.remaining_amount);
            const deductionAmount = Math.min(availableInBatch, costToDeduct);
            
            // Znížime zostávajúci amount v batchi
            await supabase
                .from('credit_batches')
                .update({ remaining_amount: availableInBatch - deductionAmount })
                .eq('id', batch.id);
                
            // Zaznamenáme deduction kvôli referencii na vrátenie
            await supabase
                .from('booking_deductions')
                .insert({
                    booking_id: newBookingId,
                    batch_id: batch.id,
                    amount: deductionAmount
                });
                
            costToDeduct -= deductionAmount;
        }

        // Aggregate cache update pre staré UI zobrazenia
        await supabase
            .from('profiles')
            .update({ credits: (profile.credits || 0) - totalCost })
            .eq('id', user.id);
    }


    revalidatePath('/dashboard/trainings');
    revalidatePath('/admin/trainings'); // Refresh admin view too
    revalidatePath('/dashboard');

    // Send Booking Confirmation Email
    try {
        const { sendEmail } = await import('@/utils/email');
        const { getEmailTemplate } = await import('@/utils/email-template');

        const formattedDate = new Date(startTimeISO).toLocaleString('sk-SK');
        const html = getEmailTemplate(
            'Potvrdenie rezervácie',
            `
            <p>Dobrý deň,</p>
            <p>úspešne sme rezervovali Vaše miesto na tréningu:</p>
            
            <div class="highlight-box">
                <p style="margin: 5px 0;"><strong>Tréning:</strong> ${trainingType.title}</p>
                <p style="margin: 5px 0;"><strong>Dátum a čas:</strong> ${formattedDate}</p>
            </div>
            
            <p>Tešíme sa na Vás!</p>
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
        .select('start_time, participants_count, training_type:training_type_id(title, price_credits)')
        .eq('id', bookingId)
        .eq('user_id', user.id)
        .single();

    if (fetchError || !booking) {
        return { success: false, message: 'Rezervácia sa nenašla.' };
    }

    const trainingTypeData = booking.training_type as any;
    const priceCredits = (Array.isArray(trainingTypeData) ? trainingTypeData[0]?.price_credits : trainingTypeData?.price_credits) ?? 1;
    const participantsCount = booking.participants_count || 1;

    // 2. Check 12h rule
    const startTime = new Date(booking.start_time);
    const now = new Date();
    const diffMs = startTime.getTime() - now.getTime();
    const hoursValues = diffMs / (1000 * 60 * 60);
    const shouldRefund = hoursValues >= 12;

    // FÁZA 2: Získame detail o použitých kreditoch (deductions) PRED zmazaním rezervácie
    const { data: deductions } = await supabase
        .from('booking_deductions')
        .select('*')
        .eq('booking_id', bookingId);

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
    let totalRefund = 0;
    if (shouldRefund) {
        if (deductions && deductions.length > 0) {
            // FÁZA 2: Vrátime presné čiastky do jednotlivých batchov
        for (const deduction of deductions) {
            const { data: batchData } = await supabase.from('credit_batches').select('remaining_amount').eq('id', deduction.batch_id).single();
            if (batchData) {
                await supabase
                    .from('credit_batches')
                    .update({ remaining_amount: Number(batchData.remaining_amount) + Number(deduction.amount) })
                    .eq('id', deduction.batch_id);
                totalRefund += Number(deduction.amount);
            }
        }
        
        // Update the cached total in profiles
        const { data: prof } = await supabase.from('profiles').select('credits, unlimited_expires_at').eq('id', user.id).single();
        if (prof) {
            await supabase
                .from('profiles')
                .update({ credits: (prof.credits || 0) + totalRefund })
                .eq('id', user.id);
        }
        
    } else if (shouldRefund) {
        // FALLBACK pre staré (historické) rezervácie pred spustením Fázy 2
        // Tie nemajú 'deductions', takže im musíme vrátiť kredit naslepo podľa počtu
        
        const { data: profile } = await supabase.from('profiles').select('credits, unlimited_expires_at').eq('id', user.id).single();
        const isUnlimited = profile?.unlimited_expires_at && new Date(profile.unlimited_expires_at) > new Date();

        const selfRefund = isUnlimited ? 0 : priceCredits;
        const additionalRefund = (participantsCount - 1) * priceCredits;
        totalRefund = selfRefund + additionalRefund;

        if (totalRefund > 0) {
            // Nájdeme batch, ktorý končí najneskôr, a tam to prihodíme
            const { data: latestBatch } = await supabase
                .from('credit_batches')
                .select('*')
                .eq('user_id', user.id)
                .order('expires_at', { ascending: false, nullsFirst: true })
                .limit(1)
                .single();

            if (latestBatch) {
                await supabase
                    .from('credit_batches')
                    .update({ remaining_amount: Number(latestBatch.remaining_amount) + totalRefund })
                    .eq('id', latestBatch.id);
            } else {
                // Nemá aktívne batche, vytvoríme nový základný na 1 mesiac
                let endD = new Date();
                endD.setMonth(endD.getMonth() + 1);
                await supabase
                    .from('credit_batches')
                    .insert({
                        user_id: user.id,
                        amount: totalRefund,
                        remaining_amount: totalRefund,
                        expires_at: endD.toISOString()
                    });
            }

            // Update prof.credits (cache)
            if (profile) {
                await supabase
                    .from('profiles')
                    .update({ credits: (profile.credits || 0) + totalRefund })
                    .eq('id', user.id);
            }
            }
        }
    }

    revalidatePath('/dashboard/trainings');
    revalidatePath('/admin/trainings');
    revalidatePath('/dashboard');

    // 5. Send Cancellation Email
    try {
        const { sendEmail } = await import('@/utils/email');
        const { getEmailTemplate } = await import('@/utils/email-template');

        const refundMessage = shouldRefund
            ? (totalRefund > 0 ? `a ${totalRefund} kr. ti bolo vrátené na účet.` : 'tento tréning bol zadarmo.')
            : 'ale keďže je to menej ako 12h pred tréningom, <strong>vstup nebol vrátený</strong>.';

        const html = getEmailTemplate(
            'Zrušenie rezervácie',
            `
            <p>Dobrý deň,</p>
            <p>Vaša rezervácia na tréning <strong>${// @ts-ignore
            booking.training_type?.title || 'Tréning'}</strong> bola zrušená ${refundMessage}</p>
            <p>Dúfame, že si čoskoro nájdete iný termín.</p>
            
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
        message: shouldRefund ? 'Rezervácia zrušená, vstup bol vrátený.' : 'Rezervácia zrušená (bez vrátenia kreditu, < 12h).'
    };
}
