'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function addTrainerVacation(trainerId: string, startDateISO: string, endDateISO: string, description: string) {
    const supabase = await createClient();
    
    // Verify that the user is the trainer or admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    
    if (profile?.role === 'trainer') {
        // Ensure the trainer is adding vacation for themselves
        const { data: trainer } = await supabase.from('trainers').select('id').eq('profile_id', user.id).single();
        if (!trainer || trainer.id !== trainerId) {
            return { success: false, error: 'Unauthorized to add vacation for this trainer.' };
        }
    } else if (profile?.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    if (!(new Date(endDateISO).getTime() > new Date(startDateISO).getTime())) {
        return { success: false, error: 'Koniec voľna musí byť po jeho začiatku.' };
    }

    // Trainers have the role 'trainer', which the vacations write policy does not include
    // (it admits staff only). Ownership was verified above, so write with the service role.
    const { error } = await createAdminClient().from('vacations').insert({
        trainer_id: trainerId,
        start_time: startDateISO,
        end_time: endDateISO,
        description: description || null
    });

    if (error) {
        console.error('Error adding trainer vacation:', error);
        return { success: false, error: 'Nepodarilo sa pridať dovolenku.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/trainings');
    return { success: true };
}

export async function removeTrainerVacation(vacationId: string, trainerId: string) {
    const supabase = await createClient();
    
    // Verify that the user is the trainer or admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    
    if (profile?.role === 'trainer') {
        // Ensure the trainer is removing their own vacation
        const { data: trainer } = await supabase.from('trainers').select('id').eq('profile_id', user.id).single();
        if (!trainer || trainer.id !== trainerId) {
            return { success: false, error: 'Unauthorized to remove this vacation.' };
        }
    } else if (profile?.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
    }

    const { error } = await createAdminClient().from('vacations')
        .delete()
        .eq('id', vacationId)
        .eq('trainer_id', trainerId); // Extra check to ensure we only delete this trainer's vacation

    if (error) {
        console.error('Error removing trainer vacation:', error);
        return { success: false, error: 'Nepodarilo sa zmazať dovolenku.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/trainings');
    return { success: true };
}

export async function getTrainerVacations(trainerId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase.from('vacations')
        .select('*')
        .eq('trainer_id', trainerId)
        .gte('end_time', new Date().toISOString()) // Only future/current
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching trainer vacations:', error);
        return [];
    }

    return data;
}

// Function to check if a trainer has bookings during a specific time period
export async function checkTrainerBookings(trainerId: string, startDateISO: string, endDateISO: string) {
    const supabase = await createClient();
    
    // 1. Get all training types for this trainer
    const { data: trainingTypes } = await supabase.from('training_types').select('id, schedule');
    
    if (!trainingTypes) return 0;
    
    const myTrainingTypeIds = trainingTypes.filter(tt => {
        if (!Array.isArray(tt.schedule)) return false;
        return tt.schedule.some((s: any) => s.trainer_id === trainerId && s.active !== false);
    }).map(tt => tt.id);

    if (myTrainingTypeIds.length === 0) return 0;

    // 2. Query bookings for these training types within the time range
    const { count, error } = await supabase.from('bookings')
        .select('*', { count: 'exact', head: true })
        .in('training_type_id', myTrainingTypeIds)
        .gte('start_time', startDateISO)
        .lte('start_time', endDateISO);

    if (error) {
        console.error('Error checking trainer bookings:', error);
        return 0;
    }

    return count || 0;
}

export type VacationFormState = { ok?: boolean; error?: string; at?: number };

/**
 * Form entry point for the trainer dashboard. Times are entered in Bratislava wall time
 * and stored face-value ("18:00" -> "...T18:00:00Z"), like every other training time;
 * building the string explicitly keeps that independent of the server's time zone.
 */
export async function addTrainerVacationFromForm(
    trainerId: string,
    _prev: VacationFormState,
    formData: FormData
): Promise<VacationFormState> {
    const startDate = String(formData.get('startDate') || '');
    const startTime = String(formData.get('startTime') || '00:00');
    const endDate = String(formData.get('endDate') || '');
    const endTime = String(formData.get('endTime') || '23:59');
    const description = String(formData.get('description') || '').slice(0, 200);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
        || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
        return { error: 'Vyplňte dátum a čas od aj do.', at: Date.now() };
    }

    const res = await addTrainerVacation(
        trainerId,
        `${startDate}T${startTime}:00.000Z`,
        `${endDate}T${endTime}:00.000Z`,
        description
    );
    return res.success ? { ok: true, at: Date.now() } : { error: res.error, at: Date.now() };
}
