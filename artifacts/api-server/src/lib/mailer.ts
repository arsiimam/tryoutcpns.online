/**
 * mailer.ts — Nodemailer wrapper untuk kirim email transaksional.
 *
 * Konfigurasi via .env:
 *   SMTP_HOST     — misal: smtp.gmail.com
 *   SMTP_PORT     — misal: 587
 *   SMTP_USER     — alamat email pengirim
 *   SMTP_PASS     — password atau App Password
 *   SMTP_FROM     — "Nama <email>" (opsional, default: SMTP_USER)
 *   APP_URL       — URL publik untuk link di email
 */
import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn("SMTP tidak dikonfigurasi (SMTP_HOST/SMTP_USER/SMTP_PASS). Email tidak akan dikirim.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

const from = () =>
  process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@tryoutcpns.online";

const appUrl = () =>
  (process.env.APP_URL ?? "https://tryoutcpns.online").replace(/\/$/, "");

/* ── Send reset password email ─────────────────────────────── */
export async function sendPasswordResetEmail(toEmail: string, toName: string, token: string) {
  const transport = createTransport();
  if (!transport) {
    // Dev mode — just log the link
    logger.info({ token, toEmail }, `[DEV] Reset link: ${appUrl()}/reset-password/${token}`);
    return;
  }

  const link = `${appUrl()}/reset-password/${token}`;

  await transport.sendMail({
    from: `"Tryout CPNS Online" <${from()}>`,
    to: `"${toName}" <${toEmail}>`,
    subject: "Reset Password — Tryout CPNS Online",
    html: `
<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0A1C3C,#1E4D9C);padding:32px 40px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:.5px">Tryout CPNS Online</div>
          <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:4px">tryoutcpns.online</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px">
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#0f172a">Halo, ${toName} 👋</p>
          <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6">
            Kami menerima permintaan untuk mereset password akun Anda.<br>
            Klik tombol di bawah untuk membuat password baru.
          </p>
          <div style="text-align:center;margin:0 0 28px">
            <a href="${link}" style="display:inline-block;padding:13px 32px;background:#1E4D9C;color:#fff;font-size:15px;font-weight:600;border-radius:10px;text-decoration:none">
              Reset Password
            </a>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#94a3b8">
            Link ini berlaku selama <strong>1 jam</strong>. Jika Anda tidak meminta reset password, abaikan email ini.
          </p>
          <p style="margin:0;font-size:12px;color:#cbd5e1;word-break:break-all">
            Atau salin link: <a href="${link}" style="color:#1E4D9C">${link}</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Tryout CPNS Online</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Reset Password — Tryout CPNS Online\n\nHalo ${toName},\n\nKlik link berikut untuk mereset password Anda:\n${link}\n\nLink berlaku 1 jam. Jika tidak meminta reset, abaikan email ini.`,
  });

  logger.info({ toEmail }, "Password reset email sent");
}
