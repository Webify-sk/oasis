'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function upsertTrainer(prevState: any, formData: FormData) {
    const supabase = await createClient();

    try {
        const id = formData.get('id') as string;
        const full_name = formData.get('full_name') as string;
        const specialtiesString = formData.get('specialties') as string; // Comma separated
        const bio = formData.get('bio') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const photo = formData.get('photo') as File;

        const specialties = specialtiesString ? specialtiesString.split(',').map(s => s.trim()).filter(Boolean) : [];

        let avatar_url = undefined;

        // Handle Photo Upload
        if (photo && photo.size > 0) {
            // Unique filename or overwrite id-based
            // Using timestamp to avoid caching issues on update
            const filename = `${Date.now()}_${photo.name.replace(/\s+/g, '-')}`;

            // Ensure filename is safe
            const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(safeFilename, photo, {
                    upsert: true
                });

            if (uploadError) {
                console.error('Upload Error:', uploadError);
                return { message: 'Error uploading photo: ' + uploadError.message };
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(safeFilename);

            avatar_url = publicUrl;
        }

        const data: any = {
            full_name,
            specialties,
            bio,
        };

        // Only update avatar_url if a new one was uploaded
        if (avatar_url) {
            data.avatar_url = avatar_url;
        }

        let error;

        if (id) {
            const { error: updateError } = await supabase
                .from('trainers')
                .update(data)
                .eq('id', id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('trainers')
                .insert(data);
            error = insertError;
        }

        if (error) {
            console.error('DB Error:', error);
            return {
                message: 'Error saving trainer: ' + error.message,
                inputs: {
                    full_name,
                    specialties: specialtiesString,
                    bio,
                    email,
                    phone
                }
            };
        }

    } catch (e) {
        console.error('Unexpected Error:', e);
        return {
            message: 'Nastala neočakávaná chyba: ' + (e as Error).message,
            inputs: {
                full_name: formData.get('full_name'),
                specialties: formData.get('specialties'),
                bio: formData.get('bio'),
                email: formData.get('email'),
                phone: formData.get('phone')
            }
        };
    }

    revalidatePath('/admin/trainers');
    redirect('/admin/trainers');
}

export async function deleteTrainer(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('trainers')
        .delete()
        .eq('id', id);

    if (error) {
        return { message: 'Chyba pri mazaní trénera: ' + error.message };
    }

    revalidatePath('/admin/trainers');
    return { message: 'Tréner bol úspešne vymazaný.' };
}
