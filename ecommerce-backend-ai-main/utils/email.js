import nodemailer from 'nodemailer';

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
}

export async function sendOtpEmail(to, code) {
  const transporter = buildTransporter();
  if (!transporter) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  const siteUrl = process.env.FRONTEND_URL || '';
  const verifyLink = siteUrl ? `${siteUrl}/auth` : null;

  const textBody = [
    `Your SHREDA verification code is: ${code}`,
    `It expires in 10 minutes.`,
    verifyLink ? `Go to ${verifyLink} and enter this code to complete your registration.` : '',
    `If you did not create an account, please ignore this email.`,
  ].filter(Boolean).join('\n\n');

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f5f8ff;border-radius:12px;">
      <h2 style="color:#0a1e3a;margin:0 0 8px;font-size:22px;">Verify your SHREDA account</h2>
      <p style="color:#555;margin:0 0 24px;font-size:15px;">
        Use the code below to complete your registration. It expires in&nbsp;<strong>10&nbsp;minutes</strong>.
      </p>
      <div style="background:#1565c0;border-radius:10px;padding:24px;text-align:center;margin:0 0 24px;">
        <span style="font-size:40px;font-weight:900;color:#fff;letter-spacing:10px;">${code}</span>
      </div>
      ${verifyLink ? `
      <p style="color:#555;margin:0 0 16px;font-size:14px;">
        <a href="${verifyLink}" style="color:#1565c0;font-weight:700;text-decoration:none;">
          Return to SHREDA &rarr;
        </a>
        &nbsp;and enter the code when prompted.
      </p>` : ''}
      <p style="color:#aaa;font-size:12px;margin:0;">
        If you didn&rsquo;t create an account, you can safely ignore this email.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"SHREDA Store" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Your SHREDA verification code',
    text: textBody,
    html: htmlBody,
  });
}
