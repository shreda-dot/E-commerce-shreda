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
    auth: { user, pass }
  });
}

export async function sendOtpEmail(to, code) {
  const transporter = buildTransporter();
  if (!transporter) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Your Shreda verification code',
    text: `Your verification code is: ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is:</p><h2>${code}</h2><p>It expires in 10 minutes.</p>`
  });
}
