const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendEmail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME || 'App'}" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
}

module.exports = { sendEmail };
