const nodemailer = require("nodemailer");

let transporter = null;

function isMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (isMailConfigured()) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    return transporter;
  }

  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });

  return transporter;
}

async function sendPasswordResetOtpEmail({ email, name, otp, expiresInMinutes }) {
  const mailer = getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@lumina.dev";
  const greetingName = name || "there";

  const info = await mailer.sendMail({
    from,
    to: email,
    subject: "Your Lumina Commerce password reset OTP",
    text: [
      `Hello ${greetingName},`,
      "",
      `Use OTP ${otp} to reset your Lumina Commerce password.`,
      `This code expires in ${expiresInMinutes} minutes.`,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <p>Hello ${greetingName},</p>
        <p>Use the OTP below to reset your Lumina Commerce password:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 8px; margin: 20px 0;">${otp}</p>
        <p>This code expires in ${expiresInMinutes} minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (!isMailConfigured()) {
    console.info(`[mail] SMTP not configured. Password reset OTP for ${email}: ${otp}`);
  }

  return info;
}

module.exports = {
  isMailConfigured,
  sendPasswordResetOtpEmail,
};
