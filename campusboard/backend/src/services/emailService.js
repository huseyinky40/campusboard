const nodemailer = require('nodemailer');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class EmailService {
  constructor() {
    this.provider = process.env.RESEND_API_KEY ? 'resend' : 'smtp';
    this.from = process.env.RESEND_FROM
      || process.env.SMTP_FROM
      || (process.env.SMTP_USER ? `"CampusBoard" <${process.env.SMTP_USER}>` : '"CampusBoard" <no-reply@campusboard.app>');

    if (this.provider === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendVerificationCode(email, code) {
    return this._send({
      to: email,
      subject: 'CampusBoard — E-posta Doğrulama Kodunuz',
      html: this._verificationHtml(code),
    });
  }

  async sendPasswordResetCode(email, code, name = '') {
    return this._send({
      to: email,
      subject: 'CampusBoard — Password Reset Code',
      html: this._passwordResetHtml(code, name),
    });
  }

  async _send({ to, subject, html }) {
    if (this.provider === 'resend') {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Resend email failed: ${response.status} ${detail}`);
      }
      return response.json();
    }

    return this.transporter.sendMail({ from: this.from, to, subject, html });
  }

  _verificationHtml(code) {
    return `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="margin-bottom:24px;">
          <span style="font-size:20px;font-weight:800;color:#0f172a;">Campus<span style="color:#6366f1;">Board</span></span>
        </div>
        <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px;">E-posta Adresinizi Doğrulayın</h2>
        <p style="color:#64748b;font-size:15px;margin:0 0 24px;">
          Kayıt işleminizi tamamlamak için aşağıdaki doğrulama kodunu girin.
        </p>
        <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0f172a;">${escapeHtml(code)}</span>
        </div>
        <p style="color:#94a3b8;font-size:13px;margin:0;">
          Bu kod 1 saat geçerlidir. Eğer kayıt talebinde bulunmadıysanız bu e-postayı yoksayın.
        </p>
      </div>
    `;
  }

  _passwordResetHtml(code, name = '') {
    const firstName = escapeHtml(String(name || '').trim().split(/\s+/)[0] || 'there');
    const safeCode = escapeHtml(code);

    return `
      <div style="margin:0;padding:0;background:#050509;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f8fafc;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050509;padding:34px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;border:1px solid #242435;border-radius:24px;overflow:hidden;background:#0b0b13;box-shadow:0 28px 80px rgba(0,0,0,.45);">
                <tr>
                  <td style="padding:22px 28px;background:linear-gradient(135deg,#ef4444 0%,#7c3aed 100%);">
                    <div style="font-size:22px;font-weight:900;letter-spacing:-.02em;color:#fff;">
                      Campus<span style="color:#ede9fe;">Board</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px 30px 28px;">
                    <h1 style="margin:0 0 14px;font-size:30px;line-height:1.1;color:#fff;letter-spacing:-.03em;">Password Reset</h1>
                    <p style="margin:0 0 16px;color:#a1a1aa;font-size:15px;line-height:1.7;">Hello, ${firstName}!</p>
                    <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
                      Use the code below to reset your password. Valid for 10 minutes. Case-sensitive — enter it carefully.
                    </p>
                    <div style="margin:0 0 24px;padding:22px 18px;border:1px solid rgba(168,85,247,.62);border-radius:18px;background:#11111b;text-align:center;">
                      <span style="display:inline-block;color:#fff;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:34px;font-weight:900;letter-spacing:.34em;">${safeCode}</span>
                    </div>
                    <p style="margin:0;color:#71717a;font-size:13px;line-height:1.65;">
                      If you didn't request this, ignore this email and do not reset your password.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid #242435;padding:18px 28px;text-align:center;color:#52525b;font-size:12px;">
                    CampusBoard support · This message was sent automatically.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  static isConfigured() {
    return !!(
      process.env.RESEND_API_KEY
      || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    );
  }
}

module.exports = { EmailService };
