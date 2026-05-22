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
      subject: 'CampusBoard — Şifre Sıfırlama Kodu',
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

  _emailLayout(body) {
    const logo = 'https://campusboard.app/assets/campusboard_app_icon.svg';
    return `
      <div style="margin:0;padding:0;background:#050509;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f8fafc;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050509;padding:34px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;border:1px solid #242435;border-radius:24px;overflow:hidden;background:#0b0b13;box-shadow:0 28px 80px rgba(0,0,0,.45);">
                <tr>
                  <td style="padding:26px 30px 18px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:10px;">
                          <img src="${logo}" width="34" height="34" alt="CampusBoard" style="border-radius:8px;display:block;" />
                        </td>
                        <td style="vertical-align:middle;">
                          <span style="font-size:19px;font-weight:900;letter-spacing:-.02em;color:#fff;">Campus<span style="color:#a78bfa;">Board</span></span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 30px 30px;">
                    ${body}
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid #242435;padding:16px 28px;text-align:center;color:#52525b;font-size:12px;">
                    CampusBoard destek · Bu mesaj otomatik olarak gönderildi.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  _verificationHtml(code) {
    return this._emailLayout(`
      <h1 style="margin:0 0 12px;font-size:26px;line-height:1.1;color:#fff;letter-spacing:-.03em;">E-posta Adresinizi Doğrulayın</h1>
      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        Kayıt işleminizi tamamlamak için aşağıdaki doğrulama kodunu girin.
      </p>
      <div style="margin:0 0 24px;padding:22px 18px;border:1px solid rgba(99,102,241,.5);border-radius:18px;background:#11111b;text-align:center;">
        <span style="display:inline-block;color:#fff;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:36px;font-weight:900;letter-spacing:.28em;">${escapeHtml(code)}</span>
      </div>
      <p style="margin:0;color:#71717a;font-size:13px;line-height:1.65;">
        Bu kod 1 saat geçerlidir. Kayıt talebinde bulunmadıysanız bu e-postayı yoksayın.
      </p>
    `);
  }

  _passwordResetHtml(code, name = '') {
    const firstName = escapeHtml(String(name || '').trim().split(/\s+/)[0] || '');
    const safeCode = escapeHtml(code);
    const greeting = firstName ? `Merhaba, ${firstName}!` : 'Merhaba!';

    return this._emailLayout(`
      <h1 style="margin:0 0 12px;font-size:26px;line-height:1.1;color:#fff;letter-spacing:-.03em;">Şifre Sıfırlama</h1>
      <p style="margin:0 0 6px;color:#a1a1aa;font-size:15px;line-height:1.7;">${greeting}</p>
      <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.7;">
        Şifrenizi sıfırlamak için aşağıdaki kodu kullanın. 10 dakika geçerlidir, büyük/küçük harfe duyarlıdır.
      </p>
      <div style="margin:0 0 24px;padding:22px 18px;border:1px solid rgba(168,85,247,.62);border-radius:18px;background:#11111b;text-align:center;">
        <span style="display:inline-block;color:#fff;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:36px;font-weight:900;letter-spacing:.28em;">${safeCode}</span>
      </div>
      <p style="margin:0;color:#71717a;font-size:13px;line-height:1.65;">
        Bu isteği siz yapmadıysanız bu e-postayı yoksayın, şifreniz değişmeyecektir.
      </p>
    `);
  }

  static isConfigured() {
    return !!(
      process.env.RESEND_API_KEY
      || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    );
  }
}

module.exports = { EmailService };
