'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
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
        const password = formData.get('password') as string;
        const passwordConfirm = formData.get('password_confirm') as string;
        const photo = formData.get('photo') as File;

        if (!id && password && password !== passwordConfirm) {
            return {
                message: 'Heslá sa nezhodujú.',
                inputs: { full_name, specialties: specialtiesString, bio, email, phone }
            };
        }

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
        let trainerId = id;

        if (id) {
            const { error: updateError } = await supabase
                .from('trainers')
                .update(data)
                .eq('id', id);
            error = updateError;
        } else {
            const { data: insertedTrainer, error: insertError } = await supabase
                .from('trainers')
                .insert(data)
                .select()
                .single();
            error = insertError;
            if (insertedTrainer) {
                trainerId = insertedTrainer.id;
            }
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

        // Create user account if requested
        if (!id && email && password) {
            const supabaseAdmin = createAdminClient();

            const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name }
            });

            if (authError) {
                console.error('Auth create error:', authError);
                // We've already created the trainer, but failed to create the auth account
                // Just log it or return a message
            } else if (user) {
                // Update Profile Role
                await supabaseAdmin
                    .from('profiles')
                    .update({
                        full_name,
                        phone,
                        role: 'trainer',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', user.id);

                // Link Profile to Trainer
                await supabaseAdmin
                    .from('trainers')
                    .update({ profile_id: user.id, email, phone })
                    .eq('id', trainerId);

                // Send Welcome Email
                try {
                    const { sendEmail } = await import('@/utils/email');
                    const { getEmailTemplate } = await import('@/utils/email-template');

                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk';

                    const html = getEmailTemplate(
                        'Vitajte v Oasis Lounge',
                        `
                        <p>Dobrý deň,</p>
                        <p>bol vám vytvorený trénerský účet v aplikácii Oasis Lounge.</p>
                        <p>Môžete sa prihlásiť a spravovať svoje tréningy.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${baseUrl}" class="button" style="display: inline-block; background-color: #5E715D; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Prihlásiť sa</a>
                        </div>

                        <p>Vaše prihlasovacie meno je <strong>${email}</strong> a heslo vám bolo nastavené administrátorom: <strong>${password}</strong></p>
                        <p>Tím Oasis Lounge</p>
                        `
                    );

                    await sendEmail({
                        to: email,
                        subject: 'Trénerský účet - Oasis Lounge',
                        html: html
                    });

                } catch (mailError) {
                    console.error('Failed to send welcome email:', mailError);
                }
            }
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

export async function promoteToTrainer(userId: string, name: string, email: string, phone: string) {
    const supabaseAdmin = createAdminClient();

    // 1. Check if trainer record already exists
    const { data: existing } = await supabaseAdmin
        .from('trainers')
        .select('id')
        .or(`email.eq.${email},profile_id.eq.${userId}`)
        .maybeSingle();

    if (existing) {
        // Trainer record exists, ensure it's linked
        await supabaseAdmin.from('trainers').update({ profile_id: userId, email, phone }).eq('id', existing.id);
    } else {
        // Create new trainer record
        const { error: createError } = await supabaseAdmin.from('trainers').insert({
            full_name: name || 'Tréner',
            email: email,
            phone: phone,
            profile_id: userId
        });
        if (createError) {
            console.error('Error creating linked trainer:', createError);
            return { error: 'Failed to create trainer record' };
        }
    }

    // 2. Update Profile Role
    const { error: roleError } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'trainer' })
        .eq('id', userId);

    if (roleError) {
        console.error('Error updating profile role:', roleError);
    }

    revalidatePath('/admin/trainers');
    return { success: true };
}
