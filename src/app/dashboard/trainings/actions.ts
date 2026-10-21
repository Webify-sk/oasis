'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getRealUtcDate } from '@/utils/booking-logic';

// Bookings made before the FIFO credit batches went live have no booking_deductions rows.
// Only those may fall back to a price-based refund; anything newer without deductions
// simply cost nothing (unlimited membership) and refunds nothing.
const FIFO_CREDITS_SINCE = '2026-04-27';

// Postgres error codes / messages raised by the guards in sql/2026-10-21-integrity-C-up.sql
function bookingInsertErrorMessage(error: any): string {
    if (error?.code === '23505') return 'Na tento tréning ste už prihlásený.';
    if (String(error?.message || '').includes('capacity_exceeded')) return 'Na tréningu nie je dostatok voľných miest.';
    return 'Chyba pri vytváraní rezervácie: ' + (error?.message || 'unknown');
}

// Session start_time is face-value Bratislava wall time labelled UTC; compare as real instants.
function hoursUntil(faceValueISO: string): number {
    return (getRealUtcDate(faceValueISO).getTime() - Date.now()) / (1000 * 60 * 60);
}

// Rejects what the UI only greys out: a session reserved as individual for someone else,
// or one that falls into a trainer's / the studio's vacation.
async function sessionIsBlocked(db: any, trainingTypeId: string, startTimeISO: string, trainerId: string | null): Promise<string | null> {
    const { data: exception } = await db
        .from('training_session_exceptions')
        .select('is_individual')
        .eq('training_type_id', trainingTypeId)
        .eq('session_start_time', startTimeISO)
        .maybeSingle();
    if (exception?.is_individual) return 'Tento tréning je individuálny a nedá sa naň prihlásiť online.';

    const { data: vacations } = await db
        .from('vacations')
        .select('trainer_id')
        .lte('start_time', startTimeISO)
        .gt('end_time', startTimeISO);
    const hit = (vacations || []).some((v: any) => !v.trainer_id || v.trainer_id === trainerId);
    if (hit) return 'V tomto termíne je štúdio alebo tréner na dovolenke.';
    return null;
}

// Credits go back where they came from, unless that batch has already expired — then into
// a fresh one-month batch so the client can actually spend them.
async function refundDeduction(db: any, userId: string, batchId: string, amount: number) {
    const { data: batch } = await db.from('credit_batches').select('expires_at').eq('id', batchId).single();
    const expired = batch?.expires_at && new Date(batch.expires_at) < new Date();
    if (batch && !expired) {
        await db.rpc('adjust_credit_batch', { p_batch_id: batchId, p_delta: amount });
        return;
    }
    const endD = new Date();
    endD.setMonth(endD.getMonth() + 1);
    await db.from('credit_batches').insert({ user_id: userId, amount, remaining_amount: amount, expires_at: endD.toISOString() });
}
import { revalidatePath } from 'next/cache';

export async function bookTraining(trainingTypeId: string, startTimeISO: string, participantsCount: number = 1) {
    // Server actions are plain HTTP endpoints: the UI clamps this, the server must too.
    // 0 would make the booking free, a negative number would lower the occupancy.
    if (!Number.isInteger(participantsCount) || participantsCount < 1 || participantsCount > 10) {
        return { success: false, message: 'Neplatný počet účastníkov.' };
    }
    const supabase = await createClient();
    // Credit tables are no longer writable by clients (RLS); all credit bookkeeping
    // below runs with the service role after the checks in this action.
    const db = createAdminClient();
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

    // Check if training is in the past (start_time is face value, convert before comparing)
    const trainingDate = getRealUtcDate(startTimeISO);
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
        const { data: batches, error: batchesError } = await db
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

    if (profileCheck?.role !== 'admin') {
        const blocked = await sessionIsBlocked(db, trainingTypeId, startTimeISO, resolvedTrainerId);
        if (blocked) return { success: false, message: blocked };
    }

    // Insert booking (the DB trigger re-checks capacity under a lock; the unique index
    // stops a double submit)
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
        return { success: false, message: bookingInsertErrorMessage(bookingError) };
    }

    const newBookingId = newBookingParams.id;

    // FÁZA 2: FIFO Odpočet kreditov
    if (totalCost > 0) {
        let costToDeduct = totalCost;
        
        for (const batch of activeBatches) {
            if (costToDeduct <= 0) break;
            
            const availableInBatch = Number(batch.remaining_amount);
            const deductionAmount = Math.min(availableInBatch, costToDeduct);
            
            // Atomic decrement — a parallel booking can no longer overwrite this with a stale value
            await db.rpc('adjust_credit_batch', { p_batch_id: batch.id, p_delta: -deductionAmount });
                
            // Zaznamenáme deduction kvôli referencii na vrátenie
            await db
                .from('booking_deductions')
                .insert({
                    booking_id: newBookingId,
                    batch_id: batch.id,
                    amount: deductionAmount
                });
                
            costToDeduct -= deductionAmount;
        }

        // Aggregate cache update pre staré UI zobrazenia
        await db
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

        // Training times are stored as face-value wall time labelled UTC (see schedule-helpers:
        // Date.UTC over the Bratislava wall time), so formatting must use timeZone 'UTC' —
        // otherwise the server's timezone shifts the displayed time.
        const formattedDate = new Date(startTimeISO).toLocaleString('sk-SK', {
            timeZone: 'UTC',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
    // Credit tables are no longer writable by clients (RLS); all credit bookkeeping
    // below runs with the service role after the checks in this action.
    const db = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: 'Musíte byť prihlásený.' };

    // Admins cancel on behalf of clients (admin booking lists call this action too);
    // the refund then belongs to the booking's owner, never to the admin.
    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = callerProfile?.role === 'admin';

    // 1. Fetch booking details *before* deletion to get start_time
    const { data: booking, error: fetchError } = await db
        .from('bookings')
        .select('start_time, participants_count, user_id, created_at, training_type:training_type_id(title, price_credits)')
        .eq('id', bookingId)
        .single();

    if (fetchError || !booking || (!isAdmin && booking.user_id !== user.id)) {
        return { success: false, message: 'Rezervácia sa nenašla.' };
    }
    const ownerId: string = booking.user_id;

    const trainingTypeData = booking.training_type as any;
    const priceCredits = (Array.isArray(trainingTypeData) ? trainingTypeData[0]?.price_credits : trainingTypeData?.price_credits) ?? 1;
    const participantsCount = booking.participants_count || 1;

    // 2. Check 12h rule (face-value start vs real now was off by 1–2 h before)
    const shouldRefund = hoursUntil(booking.start_time) >= 12;
    const isLegacyBooking = booking.created_at < FIFO_CREDITS_SINCE;

    // FÁZA 2: Získame detail o použitých kreditoch (deductions) PRED zmazaním rezervácie
    const { data: deductions } = await db
        .from('booking_deductions')
        .select('*')
        .eq('booking_id', bookingId);

    // 3. Delete booking
    const { error: deleteError } = await db
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
            await refundDeduction(db, ownerId, deduction.batch_id, Number(deduction.amount));
            totalRefund += Number(deduction.amount);
        }
        
        // Update the cached total in profiles
        const { data: prof } = await supabase.from('profiles').select('credits, unlimited_expires_at').eq('id', ownerId).single();
        if (prof) {
            await db
                .from('profiles')
                .update({ credits: (prof.credits || 0) + totalRefund })
                .eq('id', ownerId);
        }
        
    } else if (shouldRefund && isLegacyBooking) {
        // FALLBACK pre staré (historické) rezervácie pred spustením Fázy 2
        // Tie nemajú 'deductions', takže im musíme vrátiť kredit naslepo podľa počtu.
        // Novšie rezervácie bez odpočtu nič nestáli (neobmedzené členstvo) — nič sa nevracia.
        
        const { data: profile } = await supabase.from('profiles').select('credits, unlimited_expires_at').eq('id', ownerId).single();
        const isUnlimited = profile?.unlimited_expires_at && new Date(profile.unlimited_expires_at) > new Date();

        const selfRefund = isUnlimited ? 0 : priceCredits;
        const additionalRefund = (participantsCount - 1) * priceCredits;
        totalRefund = selfRefund + additionalRefund;

        if (totalRefund > 0) {
            // Nájdeme batch, ktorý končí najneskôr, a tam to prihodíme
            const { data: latestBatch } = await db
                .from('credit_batches')
                .select('*')
                .eq('user_id', ownerId)
                .order('expires_at', { ascending: false, nullsFirst: true })
                .limit(1)
                .single();

            if (latestBatch) {
                await db
                    .from('credit_batches')
                    .update({ remaining_amount: Number(latestBatch.remaining_amount) + totalRefund })
                    .eq('id', latestBatch.id);
            } else {
                // Nemá aktívne batche, vytvoríme nový základný na 1 mesiac
                let endD = new Date();
                endD.setMonth(endD.getMonth() + 1);
                await db
                    .from('credit_batches')
                    .insert({
                        user_id: ownerId,
                        amount: totalRefund,
                        remaining_amount: totalRefund,
                        expires_at: endD.toISOString()
                    });
            }

            // Update prof.credits (cache)
            if (profile) {
                await db
                    .from('profiles')
                    .update({ credits: (profile.credits || 0) + totalRefund })
                    .eq('id', ownerId);
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

export async function rescheduleBooking(
    bookingId: string, 
    newTrainingTypeId: string, 
    newStartTimeISO: string, 
    participantsCount: number = 1
) {
    // Server actions are plain HTTP endpoints: the UI clamps this, the server must too.
    // 0 would make the booking free, a negative number would lower the occupancy.
    if (!Number.isInteger(participantsCount) || participantsCount < 1 || participantsCount > 10) {
        return { success: false, message: 'Neplatný počet účastníkov.' };
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: 'Musíte byť prihlásený.' };

    // 1. Fetch old booking and check permissions
    const { data: oldBooking, error: fetchError } = await supabase
        .from('bookings')
        .select('*, training_type:training_type_id(title, price_credits)')
        .eq('id', bookingId)
        .single();
        
    if (fetchError || !oldBooking) {
        return { success: false, message: 'Pôvodná rezervácia sa nenašla.' };
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin';

    if (!isAdmin && oldBooking.user_id !== user.id) {
        return { success: false, message: 'Nemáte oprávnenie upraviť túto rezerváciu.' };
    }

    const db = isAdmin ? (await import('@/utils/supabase/admin')).createAdminClient() : supabase;

    // 2. Check time logic (12h rule) for old booking — compared as real instants
    const now = new Date();
    const shouldRefundOld = isAdmin || hoursUntil(oldBooking.start_time) >= 12;

    // 3. Check new training capacity
    const trainingDate = getRealUtcDate(newStartTimeISO);
    if (trainingDate < now && !isAdmin) {
        return { success: false, message: 'Na vybraný tréning sa už nedá prihlásiť (termín uplynul).' };
    }

    const { data: newTrainingType } = await supabase
        .from('training_types')
        .select('capacity, title, price_credits, schedule')
        .eq('id', newTrainingTypeId)
        .single();

    if (!newTrainingType) return { success: false, message: 'Nový tréning sa nenašiel.' };

    // Own booking must not count against the target session (rescheduling within the same one)
    const { data: slotBookings } = await supabase
        .from('bookings')
        .select('participants_count')
        .eq('training_type_id', newTrainingTypeId)
        .eq('start_time', newStartTimeISO)
        .neq('id', bookingId);

    const currentOccupancy = slotBookings?.reduce((sum, b) => sum + (b.participants_count || 1), 0) || 0;

    if (currentOccupancy + participantsCount > newTrainingType.capacity) {
        return { success: false, message: 'Na novom tréningu nie je dostatok voľných miest.' };
    }

    if (!isAdmin && currentOccupancy === 0) {
        const { isBookingLocked } = await import('@/utils/booking-logic');
        const { isLocked, deadlineMsg } = isBookingLocked(newStartTimeISO);
        if (isLocked) {
            return { success: false, message: `Na nový tréning sa nedá prihlásiť. (Deadline: ${deadlineMsg} vopred)` };
        }
    }

    // 4. Resolve trainer_id for new training
    let resolvedTrainerId = null;
    if (newTrainingType.schedule && Array.isArray(newTrainingType.schedule)) {
        const dateObj = new Date(newStartTimeISO);
        const slovakDays = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
        const dayName = slovakDays[dateObj.getUTCDay()];
        const timeString = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;
        const dateString = newStartTimeISO.split('T')[0];

        const scheduleItem = newTrainingType.schedule.find((s: any) => {
            if (s.isRecurring !== false) {
                return s.day === dayName && s.time && s.time.startsWith(timeString);
            } else {
                return s.date === dateString && s.time && s.time.startsWith(timeString);
            }
        });
        if (scheduleItem?.trainer_id) resolvedTrainerId = scheduleItem.trainer_id;
    }

    // 5. Credit logic check
    const { data: userProfile } = await supabase
        .from('profiles')
        .select('credits, unlimited_expires_at')
        .eq('id', oldBooking.user_id)
        .single();
    
    const isUnlimited = userProfile?.unlimited_expires_at && new Date(userProfile.unlimited_expires_at) > new Date();
    const priceCredits = newTrainingType.price_credits ?? 1;
    const selfCost = isUnlimited ? 0 : priceCredits;
    const additionalCost = (participantsCount - 1) * priceCredits;
    const totalCost = selfCost + additionalCost;

    let activeBatches: any[] = [];
    if (totalCost > 0) {
        const { data: batches } = await supabase
            .from('credit_batches')
            .select('*')
            .eq('user_id', oldBooking.user_id)
            .gt('remaining_amount', 0)
            .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
            .order('expires_at', { ascending: true, nullsFirst: false });
        
        activeBatches = batches || [];
    }

    let totalRefund = 0;
    const { data: deductions } = await supabase
        .from('booking_deductions')
        .select('*')
        .eq('booking_id', bookingId);
        
    if (shouldRefundOld && deductions && deductions.length > 0) {
        totalRefund = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
    } else if (shouldRefundOld && oldBooking.created_at < FIFO_CREDITS_SINCE) {
        // Legacy booking from before the FIFO batches: refund by price. Newer bookings
        // without deductions cost nothing and refund nothing. (The old `&& deductions`
        // test was always true for an empty array, so this branch never ran.)
        const oldTrainingData = oldBooking.training_type as any;
        const oldPrice = (Array.isArray(oldTrainingData) ? oldTrainingData[0]?.price_credits : oldTrainingData?.price_credits) ?? 1;
        const oldSelfRefund = isUnlimited ? 0 : oldPrice;
        const oldAdditionalRefund = (oldBooking.participants_count - 1) * oldPrice;
        totalRefund = oldSelfRefund + oldAdditionalRefund;
    }

    const totalAvailableNow = activeBatches.reduce((sum, b) => sum + Number(b.remaining_amount), 0);
    if (totalCost > 0 && (totalAvailableNow + totalRefund) < totalCost) {
        return { success: false, message: `Nemáte dostatok kreditov na zmenu termínu (vyžaduje sa ${totalCost}, budete mať ${totalAvailableNow + totalRefund}).` };
    }

    if (!isAdmin) {
        const blocked = await sessionIsBlocked(db, newTrainingTypeId, newStartTimeISO, resolvedTrainerId);
        if (blocked) return { success: false, message: blocked };
    }

    // 6. Create the NEW booking first. If that fails nothing has changed yet — the old
    //    order (delete, refund, then insert) could leave the client with no booking at all.
    const { data: newBookingParams, error: bookingError } = await db
        .from('bookings')
        .insert({
            user_id: oldBooking.user_id,
            training_type_id: newTrainingTypeId,
            start_time: newStartTimeISO,
            participants_count: participantsCount,
            trainer_id: resolvedTrainerId
        })
        .select('id')
        .single();

    if (bookingError || !newBookingParams) {
        console.error('Failed to insert new booking during reschedule:', bookingError);
        return { success: false, message: bookingInsertErrorMessage(bookingError) };
    }

    // 7. Delete old booking and process refund
    const { error: deleteError } = await db.from('bookings').delete().eq('id', bookingId);
    if (deleteError) {
        // Roll the new one back by hand; the client keeps the original booking.
        await db.from('bookings').delete().eq('id', newBookingParams.id);
        return { success: false, message: 'Chyba pri rušení pôvodnej rezervácie: ' + deleteError.message };
    }

    if (totalRefund > 0) {
        if (deductions && deductions.length > 0) {
            for (const deduction of deductions) {
                await refundDeduction(db, oldBooking.user_id, deduction.batch_id, Number(deduction.amount));
            }
        } else {
            const { data: latestBatch } = await db
                .from('credit_batches')
                .select('*')
                .eq('user_id', oldBooking.user_id)
                .order('expires_at', { ascending: false, nullsFirst: true })
                .limit(1)
                .single();
            if (latestBatch) {
                await db.from('credit_batches').update({ remaining_amount: Number(latestBatch.remaining_amount) + totalRefund }).eq('id', latestBatch.id);
            } else {
                let endD = new Date();
                endD.setMonth(endD.getMonth() + 1);
                await db.from('credit_batches').insert({ user_id: oldBooking.user_id, amount: totalRefund, remaining_amount: totalRefund, expires_at: endD.toISOString() });
            }
        }
    }

    if (userProfile && totalRefund > 0) {
        await db.from('profiles').update({ credits: (userProfile.credits || 0) + totalRefund }).eq('id', oldBooking.user_id);
    }

    const newBookingId = newBookingParams.id;

    // 8. Deduct credits for new booking
    if (totalCost > 0) {
        const { data: updatedBatches } = await db
            .from('credit_batches')
            .select('*')
            .eq('user_id', oldBooking.user_id)
            .gt('remaining_amount', 0)
            .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
            .order('expires_at', { ascending: true, nullsFirst: false });

        let costToDeduct = totalCost;
        if (updatedBatches) {
            for (const batch of updatedBatches) {
                if (costToDeduct <= 0) break;
                const availableInBatch = Number(batch.remaining_amount);
                const deductionAmount = Math.min(availableInBatch, costToDeduct);
                await db.rpc('adjust_credit_batch', { p_batch_id: batch.id, p_delta: -deductionAmount });
                await db.from('booking_deductions').insert({ booking_id: newBookingId, batch_id: batch.id, amount: deductionAmount });
                costToDeduct -= deductionAmount;
            }
        }

        const { data: currentProf } = await db.from('profiles').select('credits').eq('id', oldBooking.user_id).single();
        if (currentProf) {
            await db.from('profiles').update({ credits: (currentProf.credits || 0) - totalCost }).eq('id', oldBooking.user_id);
        }
    }

    revalidatePath('/dashboard/trainings');
    revalidatePath('/admin/trainings');
    revalidatePath('/dashboard');

    // 9. Send Reschedule Email
    try {
        const { sendEmail } = await import('@/utils/email');
        const { getEmailTemplate } = await import('@/utils/email-template');
        
        const { data: targetProfile } = await db.from('profiles').select('email').eq('id', oldBooking.user_id).single();
        const targetEmail = targetProfile?.email;

        if (targetEmail) {
            // Face-value-as-UTC storage (see bookTraining) — format with timeZone 'UTC'
            const fmt: Intl.DateTimeFormatOptions = { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
            const formattedOldDate = new Date(oldBooking.start_time).toLocaleString('sk-SK', fmt);
            const formattedNewDate = new Date(newStartTimeISO).toLocaleString('sk-SK', fmt);
            
            // @ts-ignore
            const oldTrainingTitle = oldBooking.training_type?.title || 'Tréning';

            const refundMessage = shouldRefundOld
                ? ''
                : '<p style="color: red;">Upozornenie: Keďže zmena prebehla menej ako 12 hodín pred pôvodným tréningom, kredit za pôvodný tréning Vám prepadol.</p>';

            const html = getEmailTemplate(
                'Zmena termínu tréningu',
                `
                <p>Dobrý deň,</p>
                <p>Vaša rezervácia na tréning bola úspešne presunutá.</p>
                
                <div class="highlight-box">
                    <p style="margin: 5px 0;"><del>Pôvodný tréning: ${oldTrainingTitle} (${formattedOldDate})</del></p>
                    <p style="margin: 5px 0;"><strong>Nový tréning: ${newTrainingType.title}</strong></p>
                    <p style="margin: 5px 0;"><strong>Nový dátum a čas: ${formattedNewDate}</strong></p>
                </div>
                ${refundMessage}
                <p>Tešíme sa na Vás!</p>
                <div style="text-align: center; margin-top: 20px;">
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk'}/dashboard/trainings" class="button">Moje rezervácie</a>
                </div>
                `
            );

            await sendEmail({
                to: targetEmail,
                subject: 'Potvrdenie zmena termínu tréningu',
                html: html
            });
        }
    } catch (mailError) {
        console.error('Failed to send reschedule email:', mailError);
    }

    return { success: true, message: 'Termín tréningu bol úspešne zmenený.' };
}
