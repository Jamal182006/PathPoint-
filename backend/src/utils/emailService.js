import nodemailer from 'nodemailer';

const hasSmtpConfig = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
};

const sendVerificationCodeEmail = async (email, code, { subject, title, description, purpose }) => {
  if (!hasSmtpConfig()) {
    if (process.env.EMAIL_DELIVERY_MODE === 'console' && process.env.NODE_ENV !== 'production') {
      console.log(`[Email ${purpose} Code - Console Mode] ${email}: ${code}`);
      return { sent: false, consoleOnly: true };
    }

    throw new Error('Email delivery is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS.replace(/\s+/g, ''),
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1e293b; margin-bottom: 12px;">${title}</h2>
          <p style="color: #475569;">${description}</p>
          <div style="font-size: 32px; letter-spacing: 6px; font-weight: 700; color: #312e81; margin: 20px 0;">${code}</div>
          <p style="color: #64748b; font-size: 12px;">This code expires in 10 minutes.</p>
        </div>
      `,
    });

    return { sent: true };
  } catch (error) {
    console.error(`[Email Error] Failed to send ${purpose.toLowerCase()} code:`, {
      code: error.code,
      responseCode: error.responseCode,
      command: error.command,
    });
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      throw new Error('The SMTP server rejected the configured email credentials. Replace SMTP_USER and SMTP_PASS with valid mail credentials, then restart the backend.');
    }
    throw new Error(`The ${purpose.toLowerCase()} code could not be sent. Please try again.`);
  }
};

export const sendLoginCodeEmail = (email, code) => sendVerificationCodeEmail(email, code, {
  subject: 'Your PathPoint login verification code',
  title: 'PathPoint Sign-In Code',
  description: 'Use the 6-digit code below to finish signing in:',
  purpose: 'Login',
});

export const sendPasswordResetCodeEmail = (email, code) => sendVerificationCodeEmail(email, code, {
  subject: 'Your PathPoint password reset code',
  title: 'PathPoint Password Reset',
  description: 'Use the 6-digit code below to reset your password:',
  purpose: 'Password Reset',
});
