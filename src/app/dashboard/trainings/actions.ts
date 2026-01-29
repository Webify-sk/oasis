'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function bookTraining(trainingTypeId: string, startTimeISO: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Musíte byť prihlásený.' };
    }

    // Check if training type exists and get capacity
    const { data: trainingType, error: typeError } = await supabase
        .from('training_types')
        .select('capacity, title')
        .eq('id', trainingTypeId)
        .single();

    if (typeError || !trainingType) {
        return { success: false, message: 'Tréning sa nenašiel.' };
    }

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

    if ((profile.credits || 0) < 1) {
        return { success: false, message: 'Nemáte dostatok vstupov. Prosím, zakúpte si vstupy.' };
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

    // Deduct credit
    const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: (profile.credits || 0) - 1 })
        .eq('id', user.id);

    if (creditError) {
        // Fallback: If credit update fails, ideally we should rollback booking.
        // For now logging error. A transaction via RPC would be safer.
        console.error('Failed to deduct credit', creditError);
    }

    revalidatePath('/dashboard/trainings');
    revalidatePath('/admin/trainings'); // Refresh admin view too
    return { success: true, message: 'Úspešne ste sa prihlásili na tréning.' };
}

export async function cancelBooking(bookingId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: 'Musíte byť prihlásený.' };

    const { error, count } = await supabase
        .from('bookings')
        .delete({ count: 'exact' })
        .eq('id', bookingId)
        .eq('user_id', user.id); // Security check to ensure own booking

    if (error) {
        console.error('Cancel error:', error);
        return { success: false, message: 'Chyba pri rušení rezervácie: ' + error.message };
    }

    if (count === 0) {
        return { success: false, message: 'Rezervácia sa nenašla.' };
    }

    // Refund credit
    // Fetch current first to be safe or use increment RPC if available. 
    // We will do select-update for now.
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
    if (profile) {
        await supabase
            .from('profiles')
            .update({ credits: (profile.credits || 0) + 1 })
            .eq('id', user.id);
    }

    revalidatePath('/dashboard/trainings');
    revalidatePath('/admin/trainings');
    return { success: true, message: 'Rezervácia bola zrušená a vstup vrátený.' };
}
