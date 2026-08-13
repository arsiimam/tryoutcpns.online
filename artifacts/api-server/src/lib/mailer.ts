/**
 * mailer.ts — Nodemailer wrapper untuk kirim email transaksional.
 *
 * Konfigurasi bisa dari DB (app_settings) atau .env sebagai fallback:
 *   smtp_host / SMTP_HOST
 *   smtp_port / SMTP_PORT
 *   smtp_user / SMTP_USER
 *   smtp_pass / SMTP_PASS
 *   smtp_from / SMTP_FROM
 *   app_url   / APP_URL
 */
import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { logger } from "./logger";

const SMTP_KEYS = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "app_url"];

async function getSmtpConfig() {
  // Baca dari DB dulu
  const rows = await db
    .select()
    .from(appSettingsTable)
    .where(inArray(appSettingsTable.key, SMTP_KEYS));

  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  return {
    host: map["smtp_host"]  || process.env.SMTP_HOST  || "",
    port: parseInt(map["smtp_port"] || process.env.SMTP_PORT || "587", 10),
    user: map["smtp_user"]  || process.env.SMTP_USER  || "",
    pass: map["smtp_pass"]  || process.env.SMTP_PASS  || "",
    from: map["smtp_from"]  || process.env.SMTP_FROM  || map["smtp_user"] || process.env.SMTP_USER || "noreply@tryoutcpns.online",
    appUrl: (map["app_url"] || process.env.APP_URL || "https://tryoutcpns.online").replace(/\/$/, ""),
  };
}

/* ── Send reset password email ─────────────────────────────── */
export async function sendPasswordResetEmail(toEmail: string, toName: string, token: string) {
  const cfg = await getSmtpConfig();

  if (!cfg.host || !cfg.user || !cfg.pass) {
    logger.warn("SMTP tidak dikonfigurasi. Email tidak akan dikirim.");
    logger.info({ token, toEmail }, `[DEV] Reset link: ${cfg.appUrl}/reset-password/${token}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { rejectUnauthorized: false },
  });

  const link = `${cfg.appUrl}/reset-password/${token}`;

  await transport.sendMail({
    from: cfg.from,
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
        <tr><td style="background:linear-gradient(135deg,#0A1C3C,#1E4D9C);padding:32px 40px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:.5px">Tryout CPNS Online</div>
          <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:4px">tryoutcpns.online</div>
        </td></tr>
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
