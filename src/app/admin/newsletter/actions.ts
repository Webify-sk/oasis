'use server';

import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/utils/email';
import { getEmailTemplate } from '@/utils/email-template';

interface SendBulkEmailParams {
    targetUserIds: string[];
    emailSubject: string;
    emailHtml: string;
}

// Send emails in batches to avoid overwhelming the SMTP server
const BATCH_SIZE = 20;

// Verify the current user is an admin/employee. Returns the supabase client on success.
async function requireStaff() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nie ste prihlásený.' as const };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'employee')) {
        return { error: 'Nemáte oprávnenie na túto akciu.' as const };
    }
    return { supabase };
}

export async function uploadNewsletterImage(formData: FormData) {
    const auth = await requireStaff();
    if ('error' in auth) return { error: auth.error };
    const { supabase } = auth;

    const file = formData.get('image');
    if (!(file instanceof File) || file.size === 0) {
        return { error: 'Žiadny obrázok.' };
    }
    if (!file.type.startsWith('image/')) {
        return { error: 'Súbor musí byť obrázok.' };
    }
    if (file.size > 5 * 1024 * 1024) {
        return { error: 'Obrázok je príliš veľký (max. 5 MB).' };
    }

    const safeName = `newsletter/${Date.now()}_${file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_/]/g, '')}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(safeName, file, { upsert: true });

    if (uploadError) {
        console.error('Newsletter image upload error:', uploadError);
        return { error: 'Nepodarilo sa nahrať obrázok: ' + uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(safeName);

    return { url: publicUrl };
}

export async function sendBulkEmailAction({ targetUserIds, emailSubject, emailHtml }: SendBulkEmailParams) {
    try {
        const auth = await requireStaff();
        if ('error' in auth) return { error: auth.error };
        const { supabase } = auth;

        if (!emailSubject || emailSubject.trim().length === 0) {
            return { error: 'Zadajte predmet emailu.' };
        }

        // Strip tags to ensure there is actual content, not just empty markup
        const plainText = emailHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        if (!plainText) {
            return { error: 'Zadajte text emailu.' };
        }

        if (targetUserIds.length === 0) {
            return { error: 'Vyberte aspoň jedného príjemcu.' };
        }

        // Fetch recipient emails
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', targetUserIds);

        if (usersError || !users) {
            return { error: 'Nepodarilo sa načítať príjemcov.' };
        }

        const recipients = users.filter(u => !!u.email);

        if (recipients.length === 0) {
            return { error: 'Žiadny z vybraných príjemcov nemá emailovú adresu.' };
        }

        const fullHtml = getEmailTemplate(
            emailSubject,
            `
                ${emailHtml}

                <p style="margin-top: 30px;">
                    <a href="https://www.oasislounge.sk/" class="button" style="display: inline-block; background-color: #93745F; color: white !important; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                        Rezervovať termín
                    </a>
                </p>
            `
        );

        // Send in batches
        let sent = 0;
        let failed = 0;

        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(
                batch.map(u => sendEmail({
                    to: u.email as string,
                    subject: emailSubject,
                    html: fullHtml
                }))
            );

            results.forEach(r => {
                if (r.status === 'fulfilled' && (r.value as any)?.success) {
                    sent++;
                } else {
                    failed++;
                }
            });
        }

        return { success: true, sent, failed, total: recipients.length };

    } catch (error: any) {
        console.error('Error sending bulk email:', error);
        return { error: 'Nastala chyba pri odosielaní emailov.' };
    }
}
