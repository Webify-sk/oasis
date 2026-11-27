// footerNote replaces the default "automatically generated" line — the newsletter
// puts its reason-for-receiving text and the unsubscribe link there.
export function getEmailTemplate(title: string, bodyContent: string, previewText: string = '', footerNote?: string) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk';
    const logoUrl = `${baseUrl}/Logo_Brown.png`;
    // The visible link text must be the address the link really opens: a label
    // showing a different domain than the href is a classic phishing signal.
    const baseLabel = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

    return `
<!DOCTYPE html>
<html lang="sk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FCFBF9; color: #333333; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background-color: #FCFBF9; padding: 30px 20px; text-align: center; border-bottom: 3px solid #5E715D; }
        .logo { max-width: 150px; height: auto; }
        .content { padding: 40px 30px; line-height: 1.6; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #888888; }
        h1 { color: #5E715D; font-size: 24px; margin-bottom: 20px; font-weight: normal; font-family: Georgia, serif; }
        p { margin-bottom: 15px; }
        .button { display: inline-block; background-color: #5E715D; color: #ffffff !important; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
        .highlight-box { background-color: #f9f9f9; border-left: 4px solid #5E715D; padding: 15px; margin: 20px 0; }
        a { color: #5E715D; text-decoration: none; }
    </style>
</head>
<body>
    <div style="padding: 20px 0;">
        <div class="container">
            <div class="header">
                <img src="${logoUrl}" alt="Oasis Lounge" class="logo">
            </div>
            <div class="content">
                <h1>${title}</h1>
                ${bodyContent}
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Oasis Lounge. Všetky práva vyhradené.</p>
                <p>${footerNote ?? 'Toto je automaticky generovaný e-mail, prosím neodpovedajte naň.'}</p>
                <p><a href="${baseUrl}">${baseLabel}</a></p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}
