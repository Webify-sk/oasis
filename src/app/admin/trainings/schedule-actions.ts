'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getTrainingExceptions(trainingId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('training_session_exceptions')
        .select('*')
        .eq('training_type_id', trainingId);

    if (error) {
        console.error('Error fetching exceptions:', error);
        return [];
    }

    return data || [];
}

export async function toggleSessionIndividual(
    trainingTypeId: string,
    sessionStartTime: string,
    isIndividual: boolean
) {
    const supabase = await createClient();

    // Check if exception already exists
    const { data: existing } = await supabase
        .from('training_session_exceptions')
        .select('id')
        .eq('training_type_id', trainingTypeId)
        .eq('session_start_time', sessionStartTime)
        .single();

    if (existing) {
        // Update existing
        const { error } = await supabase
            .from('training_session_exceptions')
            .update({ is_individual: isIndividual })
            .eq('id', existing.id);

        if (error) throw new Error(error.message);
    } else {
        // Insert new
        const { error } = await supabase
            .from('training_session_exceptions')
            .insert({
                training_type_id: trainingTypeId,
                session_start_time: sessionStartTime,
                is_individual: isIndividual
            });

        if (error) throw new Error(error.message);
    }

    revalidatePath('/admin/trainings');
    revalidatePath(`/admin/trainings/${trainingTypeId}`);
    revalidatePath('/dashboard/trainings');

    return { success: true };
}
