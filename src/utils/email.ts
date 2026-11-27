import nodemailer from 'nodemailer';

// System mail: confirmations, invoices, reminders, password resets.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

// Bulk mail (newsletter). When NEWSLETTER_SMTP_* is set, newsletters leave through
// a separate service and sender (e.g. a news. subdomain), so their reputation does
// not touch the studio's everyday mailbox. Until then they use the system server.
const hasBulkSmtp = !!process.env.NEWSLETTER_SMTP_HOST;
const bulkPort = parseInt(process.env.NEWSLETTER_SMTP_PORT || '465');
const bulkTransporter = hasBulkSmtp
    ? nodemailer.createTransport({
        host: process.env.NEWSLETTER_SMTP_HOST,
        port: bulkPort,
        secure: bulkPort === 465,
        auth: {
            user: process.env.NEWSLETTER_SMTP_USER,
            pass: process.env.NEWSLETTER_SMTP_PASSWORD,
        },
    })
    : transporter;

const DEFAULT_FROM = process.env.SMTP_FROM || '"Oasis Lounge" <noreply@oasislounge.sk>';
const BULK_FROM = (hasBulkSmtp && process.env.NEWSLETTER_SMTP_FROM) || DEFAULT_FROM;

export async function sendEmail({
    to,
    subject,
    html,
    text,
    attachments,
    headers,
    replyTo,
    bulk = false,
}: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: { filename: string; content: Buffer | string }[];
    headers?: Record<string, string>;
    replyTo?: string;
    bulk?: boolean;
}) {
    try {
        const info = await (bulk ? bulkTransporter : transporter).sendMail({
            from: bulk ? BULK_FROM : DEFAULT_FROM,
            to,
            subject,
            html,
            text,
            attachments,
            headers,
            replyTo,
        });
        console.log('Message sent: %s', info.messageId);
        if (attachments && attachments.length > 0) {
            console.log(`Email sent with ${attachments.length} attachments`);
        } else {
            console.log('Email sent without attachments');
        }
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
}
