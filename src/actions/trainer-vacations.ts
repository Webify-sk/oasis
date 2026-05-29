'use server';

import { createClient } from '@/utils/supabase/server';
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

    const { error } = await supabase.from('vacations').insert({
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

    const { error } = await supabase.from('vacations')
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
