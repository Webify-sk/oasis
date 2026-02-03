import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export async function sendEmail({
    to,
    subject,
    html,
    attachments
}: {
    to: string;
    subject: string;
    html: string;
    attachments?: { filename: string; content: Buffer | string }[];
}) {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Oasis Lounge" <info@oasis-lounge.sk>', // Default sender
            to,
            subject,
            html,
            attachments,
        });
        console.log('Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
}
