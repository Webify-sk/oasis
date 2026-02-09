'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function upsertTrainingType(prevState: any, formData: FormData) {
    const supabase = await createClient();

    try {
        const id = formData.get('id') as string;
        const title = formData.get('title') as string;
        const level = formData.get('level') as string;
        const capacity = formData.get('capacity') as string;
        const muscle_group = formData.get('muscle_group') as string;
        const duration_minutes = formData.get('duration_minutes') as string;
        const description = formData.get('description') as string;
        const perex = formData.get('perex') as string;
        const schedule = formData.get('schedule') as string; // JSON string

        const data = {
            title,
            level,
            capacity: parseInt(capacity),
            muscle_group,
            duration_minutes,
            description,
            perex,
            schedule: JSON.parse(schedule),
        };

        const inputs = {
            title,
            level,
            capacity,
            muscle_group,
            duration_minutes,
            description,
            perex,
            schedule: data.schedule // Pass parsed schedule back if possible, or string? Component expects object array.
        };

        let error;

        if (id) {
            const { error: updateError } = await supabase
                .from('training_types')
                .update(data)
                .eq('id', id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('training_types')
                .insert(data);
            error = insertError;
        }

        if (error) {
            return { message: 'Error saving training: ' + error.message, inputs };
        }
    } catch (e) {
        console.error(e);
        return {
            message: 'Nastala neočakávaná chyba.',
            inputs: {
                title: formData.get('title'),
                level: formData.get('level'),
                capacity: formData.get('capacity'),
                muscle_group: formData.get('muscle_group'),
                duration_minutes: formData.get('duration_minutes'),
                description: formData.get('description'),
                perex: formData.get('perex'),
                schedule: JSON.parse(formData.get('schedule') as string || '[]')
            }
        };
    }

    revalidatePath('/admin/trainings');
    redirect('/admin/trainings');
}

export async function deleteTrainingType(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('training_types')
        .delete()
        .eq('id', id);

    if (error) {
        return { message: 'Chyba pri mazaní tréningu: ' + error.message };
    }

    revalidatePath('/admin/trainings');
    return { message: 'Tréning bol úspešne vymazaný.' };
}
