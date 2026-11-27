'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/utils/email';
import { getEmailTemplate } from '@/utils/email-template';
import { unsubscribePageUrl, unsubscribeOneClickUrl, htmlToText } from '@/utils/newsletter';

interface SendBulkEmailParams {
    targetUserIds: string[];
    emailSubject: string;
    emailHtml: string;
}

// The form sends recipients in small groups (one call per group) so a single
// request never runs long enough to hit the hosting time limit.
const MAX_PER_CALL = 25;
const SEND_PAUSE_MS = 300;

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
    // The storage policy on this bucket only lets admins write, but employees send
    // newsletters too. The role was checked above, so upload with the service role.
    const supabase = createAdminClient();

    const file = formData.get('image');
    if (!(file instanceof File) || file.size === 0) {
        return { error: 'Žiadny obrázok.' };
    }
    // Raster formats only: an SVG can carry script and the bucket is public.
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        return { error: 'Podporované sú obrázky JPG, PNG, GIF a WebP.' };
    }
    if (file.size > 5 * 1024 * 1024) {
        return { error: 'Obrázok je príliš veľký (max. 5 MB).' };
    }

    // Random name: nothing from the original file name reaches the public URL
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/gif' ? 'gif' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const safeName = `newsletter/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(safeName, file, { upsert: false, contentType: file.type });

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

        if (targetUserIds.length > MAX_PER_CALL) {
            return { error: `Naraz je možné odoslať najviac ${MAX_PER_CALL} emailov.` };
        }

        // Fetch recipients. select('*') so the code also runs before the
        // newsletter_subscribed column exists (then everyone counts as subscribed).
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', targetUserIds);

        if (usersError || !users) {
            return { error: 'Nepodarilo sa načítať príjemcov.' };
        }

        // The form already hides these people, but the server decides: nobody who
        // unsubscribed or was deactivated gets a newsletter.
        const recipients = users.filter(u => !!u.email && u.newsletter_subscribed !== false && u.is_active !== false);
        const skipped = targetUserIds.length - recipients.length;

        const body = `
            ${emailHtml}

            <p style="margin-top: 30px;">
                <a href="https://www.oasislounge.sk/" class="button" style="display: inline-block; background-color: #93745F; color: white !important; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                    Rezervovať termín
                </a>
            </p>
        `;

        // One at a time with a short pause: a burst of parallel connections from a
        // shared mail server is what throttling and spam filters react to.
        let sent = 0;
        const failedEmails: string[] = [];

        for (const u of recipients) {
            const html = getEmailTemplate(
                emailSubject,
                body,
                '',
                `Tento e-mail ste dostali, pretože máte účet v rezervačnom systéme Oasis Lounge. ` +
                `Ak si novinky neželáte dostávať, môžete sa <a href="${unsubscribePageUrl(u.id)}" style="color:#888888;text-decoration:underline;">odhlásiť z odberu</a>.`
            );

            const res = await sendEmail({
                to: u.email as string,
                subject: emailSubject,
                html,
                text: htmlToText(html),
                bulk: true,
                replyTo: process.env.NEWSLETTER_REPLY_TO || undefined,
                headers: {
                    // Lets Gmail/Outlook show their own Unsubscribe button, so an
                    // uninterested reader has an alternative to "Report spam".
                    'List-Unsubscribe': `<${unsubscribeOneClickUrl(u.id)}>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                    'Precedence': 'bulk',
                },
            });

            if (res.success) sent++;
            else failedEmails.push(u.email as string);

            await new Promise(r => setTimeout(r, SEND_PAUSE_MS));
        }

        return { success: true, sent, failed: failedEmails.length, failedEmails, skipped, total: targetUserIds.length };

    } catch (error: any) {
        console.error('Error sending bulk email:', error);
        return { error: 'Nastala chyba pri odosielaní emailov.' };
    }
}
