'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/utils/check-role';

export async function upsertTrainer(prevState: any, formData: FormData) {
    // Parts of this action run with the service role (account linking and creation),
    // so the caller's role has to be checked here, not left to RLS.
    await requireAdmin();
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

        if (password && password !== passwordConfirm) {
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
            email: email || null,
            phone: phone || null,
        };

        const formInputs = { full_name, specialties: specialtiesString, bio, email, phone };
        let accountExists = false;

        // Ak je zadaný email, pokúsime sa prepojiť existujúci účet (pri úprave aj pri novom trénerovi)
        if (email) {
            const supabaseAdmin = createAdminClient();
            const { data: existingProfiles } = await supabaseAdmin
                .from('profiles')
                .select('id, role')
                // case-insensitive exact match; % and _ are wildcards in ilike, so escape them
                .ilike('email', email.trim().replace(/[\\%_]/g, c => '\\' + c));

            if (existingProfiles && existingProfiles.length > 0) {
                accountExists = true;

                // One account, one trainer record. Linking the same account to a second record
                // leaves the schedule on one and the login on the other — the trainer then
                // sees an empty dashboard.
                const { data: alreadyLinked } = await supabaseAdmin
                    .from('trainers')
                    .select('id, full_name')
                    .eq('profile_id', existingProfiles[0].id);
                const other = (alreadyLinked || []).find(t => t.id !== id);
                if (other) {
                    return {
                        message: `Účet s týmto e-mailom je už prepojený s trénerom „${other.full_name.trim()}“. Upravte ten záznam, alebo z neho e-mail najprv odstráňte.`,
                        inputs: formInputs
                    };
                }

                data.profile_id = existingProfiles[0].id;
                
                // Uistíme sa, že prepojený profil má rolu trénera — ale nikdy neznižujeme
                // rolu adminovi alebo zamestnancovi, ktorý je zároveň trénerom.
                if (!['admin', 'employee'].includes(existingProfiles[0].role)) {
                    await supabaseAdmin
                        .from('profiles')
                        .update({ role: 'trainer' })
                        .eq('id', data.profile_id);
                }
            }
        }

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

        // Create user account if requested — for a new trainer, and also for an existing
        // trainer who has no account yet (so nobody needs to create a duplicate record).
        if (email && password && !accountExists) {
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

// Trainers are deactivated, never deleted: deleting would strip the trainer's name from
// every past session in the statistics.
export async function setTrainerActive(id: string, active: boolean) {
    await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('trainers')
        .update({ is_active: active })
        .eq('id', id)
        .select('full_name')
        .maybeSingle();

    if (error) {
        console.error('setTrainerActive error:', error);
        return { error: 'Zmenu sa nepodarilo uložiť: ' + error.message };
    }
    if (!data) return { error: 'Tréner sa nenašiel.' };

    let futureTerms = 0;
    if (!active) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: tts } = await supabase.from('training_types').select('schedule');
        for (const tt of tts || []) {
            for (const term of (Array.isArray(tt.schedule) ? tt.schedule : [])) {
                if (term.trainer_id === id && term.active !== false && term.date && String(term.date).slice(0, 10) >= today) futureTerms++;
            }
        }
    }

    revalidatePath('/admin/trainers');
    const name = String(data.full_name).trim();
    if (active) return { message: `Tréner ${name} je znova aktívny.` };
    return {
        message: futureTerms > 0
            ? `Tréner ${name} je deaktivovaný. V rozvrhu má ešte ${futureTerms} budúcich termínov — tie ostávajú, priraďte ich inému trénerovi alebo ich zrušte.`
            : `Tréner ${name} je deaktivovaný.`
    };
}

// Gives an account the trainer role and links it to a trainer record.
//
// `link` says which record: a trainer id, 'new' to create one, or empty to decide here.
// Deciding here never creates a record while unlinked trainers exist — that is how the
// duplicates arose (schedule on one record, login on another). In that case the caller
// gets `needsChoice` and must ask the admin.
export async function promoteToTrainer(userId: string, name: string, email: string, phone: string, link: string = '') {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const setRole = async () => {
        const { data: prof } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single();
        if (prof && prof.role !== 'admin' && prof.role !== 'trainer') {
            await supabaseAdmin.from('profiles').update({ role: 'trainer' }).eq('id', userId);
        }
    };

    // 1. Already linked: nothing to create, ever.
    const { data: linked } = await supabaseAdmin.from('trainers').select('id').eq('profile_id', userId);
    if (linked && linked.length > 0) {
        await setRole();
        revalidatePath('/admin/trainers');
        return { success: true };
    }

    const { data: unlinked } = await supabaseAdmin
        .from('trainers')
        .select('id, full_name, email, phone')
        .is('profile_id', null);
    const candidates = unlinked || [];

    let target = link && link !== 'new' ? candidates.find(t => t.id === link) : undefined;
    if (link && link !== 'new' && !target) {
        return { error: 'Vybraný záznam trénera už má účet alebo neexistuje.' };
    }

    // 2. No explicit choice: an unlinked record with the same e-mail is the same person.
    if (!link && email) {
        target = candidates.find(t => (t.email || '').trim().toLowerCase() === email.trim().toLowerCase());
    }

    if (target) {
        await supabaseAdmin.from('trainers')
            .update({ profile_id: userId, email: email || target.email, phone: target.phone || phone || null })
            .eq('id', target.id);
    } else if (link === 'new' || candidates.length === 0) {
        const { error: createError } = await supabaseAdmin.from('trainers').insert({
            full_name: name || 'Tréner',
            email: email || null,
            phone: phone || null,
            profile_id: userId
        });
        if (createError) {
            console.error('Error creating linked trainer:', createError);
            return { error: 'Záznam trénera sa nepodarilo vytvoriť.' };
        }
    } else {
        return { needsChoice: true };
    }

    await setRole();
    revalidatePath('/admin/trainers');
    return { success: true };
}
