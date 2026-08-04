import { Resend } from "resend";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import nodemailer from "nodemailer";

let resend: Resend | null = null;
let transporter: nodemailer.Transporter | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("re_placeholder") || apiKey === "re_your_resend_api_key") {
    return null;
  }
  if (!resend) {
    resend = new Resend(apiKey);
  }
  return resend;
}

function getTransporter(): nodemailer.Transporter | null {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass || user.startsWith("replace_with_") || pass.startsWith("replace_with_")) {
    return null;
  }

  if (!transporter) {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE === "false" ? false : true;

    // Use service: "gmail" if host/user indicates Gmail
    const isGmail = host.includes("gmail") || user.endsWith("@gmail.com");

    if (isGmail) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
      });
    } else {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
    }
  }

  return transporter;
}

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}) {
  const html = await render(react);

  // 1. Try SMTP (e.g. Gmail)
  const smtpClient = getTransporter();
  if (smtpClient) {
    const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@movix.example.com";
    await smtpClient.sendMail({
      from,
      to,
      subject,
      html,
    });
    return;
  }

  // 2. Try Resend
  const resendClient = getResend();
  if (resendClient) {
    const from = process.env.EMAIL_FROM ?? "Movix <noreply@movix.example.com>";
    const { error } = await resendClient.emails.send({ from, to, subject, html });
    if (error) {
      console.error("[Movix Email] send error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
    return;
  }

  // 3. Dev Fallback
  const match = html.match(/href="([^"]+)"/);
}
