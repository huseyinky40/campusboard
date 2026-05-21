const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    this.from = `"CampusBoard" <${process.env.SMTP_USER}>`;
  }

  async sendVerificationCode(email, code) {
    await this.transporter.sendMail({
      from:    this.from,
      to:      email,
      subject: 'CampusBoard — E-posta Doğrulama Kodunuz',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
          <div style="margin-bottom:24px;">
            <span style="font-size:20px;font-weight:800;color:#0f172a;">Campus<span style="color:#6366f1;">Board</span></span>
          </div>
          <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px;">E-posta Adresinizi Doğrulayın</h2>
          <p style="color:#64748b;font-size:15px;margin:0 0 24px;">
            Kayıt işleminizi tamamlamak için aşağıdaki doğrulama kodunu girin.
          </p>
          <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0f172a;">${code}</span>
          </div>
          <p style="color:#94a3b8;font-size:13px;margin:0;">
            Bu kod 1 saat geçerlidir. Eğer kayıt talebinde bulunmadıysanız bu e-postayı yoksayın.
          </p>
        </div>
      `,
    });
  }

  static isConfigured() {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }
}

module.exports = { EmailService };
