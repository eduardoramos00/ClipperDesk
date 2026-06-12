// Transactional email. Sends through SMTP (nodemailer) when SMTP_HOST is set;
// otherwise prints the message to the server console so the flow stays
// testable in development without any email provider.

import nodemailer from "nodemailer";

interface Mail {
  to: string;
  subject: string;
  text: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

export async function sendMail(mail: Mail): Promise<void> {
  if (!process.env.SMTP_HOST) {
    console.log(
      `[mail] SMTP_HOST not set — printing email instead\n` +
        `To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}`
    );
    return;
  }

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || "ClipperDesk <no-reply@localhost>",
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
  });
}
