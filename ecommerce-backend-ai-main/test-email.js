import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'ezinwaugochukw@gmail.com',
    pass: 'jhmuczcrgbtqkxfo', // paste directly, no env
  },
  tls: { rejectUnauthorized: false }
});

try {
  await transporter.verify();
  console.log('✅ SMTP connection verified — credentials work!');
  
  await transporter.sendMail({
    from: 'ezinwaugochukw@gmail.com',
    to: 'ezinwaugochukw@gmail.com',
    subject: 'Shreda SMTP Test',
    text: 'If you see this, SMTP is working correctly.',
  });
  console.log('✅ Test email sent — check your inbox!');
} catch (err) {
  console.error('❌ Failed:', err.message);
}