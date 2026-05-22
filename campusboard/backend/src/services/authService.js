const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  SUPPORTED_UNIVERSITIES,
  normalizeEmail,
  findUniversityByEmail,
  findUniversityBySlug,
  publicUniversity,
  supportedDomainText,
} = require('../config/universities');

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }
  return 'campusboard-dev-secret-change-me';
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES = '7d';
const RESET_CODE_TTL_MS = 10 * 60 * 1000;

class AuthService {
  constructor(db, emailService = null) {
    this.db = db;
    this.emailService = emailService;
  }

  getSupportedUniversities() {
    return SUPPORTED_UNIVERSITIES.map(publicUniversity);
  }

  validateRegister(data) {
    const errors = [];
    const email = normalizeEmail(data.email);
    if (!data.name || !/^[^\s]+\s+[^\s]+/.test(data.name.trim()))
      errors.push('Ad ve soyad birlikte yazın');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push('Geçerli bir e-posta adresi giriniz');
    else if (!findUniversityByEmail(email))
      errors.push(`Yalnızca desteklenen üniversite e-postalarıyla kayıt yapılabilir: ${supportedDomainText()}`);
    if (!data.password || data.password.length < 8)
      errors.push('Şifre en az 8 karakter olmalıdır');
    return errors;
  }

  async register(data) {
    const errors = this.validateRegister(data);
    if (errors.length > 0) throw { type: 'validation', errors };

    const email = normalizeEmail(data.email);
    const name = data.name.trim();
    const university = findUniversityByEmail(email);
    const existing = await this.db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) throw { type: 'validation', errors: ['Bu e-posta adresi zaten kayıtlı'] };

    const hash = bcrypt.hashSync(data.password, 10);

    if (this.emailService) {
      const code    = String(Math.floor(100000 + Math.random() * 900000));
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await this.db.run(
        `INSERT INTO users (
          email, password, name, university_slug, university_name, university_domain, verify_token, verify_token_expires
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [email, hash, name, university.slug, university.name, university.domain, code, expires]
      );
      await this.emailService.sendVerificationCode(email, code);
      return { message: 'Doğrulama kodu e-posta adresinize gönderildi' };
    }

    // Tests / dev without SMTP: auto-verify
    const result = await this.db.run(
      `INSERT INTO users (
        email, password, name, university_slug, university_name, university_domain, email_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [email, hash, name, university.slug, university.name, university.domain, 1]
    );
    const newId = result.rows[0].id;
    const user = await this.getSessionUser(newId);
    return { user, token: this._sign(user) };
  }

  async verifyEmail(email, code) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.db.get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) throw { type: 'validation', errors: ['E-posta adresi bulunamadı'] };
    if (user.email_verified) throw { type: 'validation', errors: ['Bu e-posta adresi zaten doğrulanmış'] };
    if (user.verify_token !== code) throw { type: 'validation', errors: ['Doğrulama kodu hatalı'] };
    if (new Date(user.verify_token_expires) < new Date())
      throw { type: 'validation', errors: ['Kodun süresi dolmuş. Yeni kod talep edin.'] };

    await this.db.run(
      'UPDATE users SET email_verified = ?, verify_token = NULL, verify_token_expires = NULL WHERE id = ?',
      [1, user.id]
    );

    const verified = await this.getSessionUser(user.id);
    return { user: verified, token: this._sign(verified) };
  }

  async resendVerify(email) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.db.get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) throw { type: 'validation', errors: ['E-posta adresi bulunamadı'] };
    if (user.email_verified) throw { type: 'validation', errors: ['Bu e-posta adresi zaten doğrulanmış'] };

    const code    = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await this.db.run(
      'UPDATE users SET verify_token = ?, verify_token_expires = ? WHERE id = ?',
      [code, expires, user.id]
    );
    await this.emailService.sendVerificationCode(normalizedEmail, code);
    return { message: 'Yeni doğrulama kodu gönderildi' };
  }

  async forgotPassword(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      throw { type: 'validation', errors: ['Geçerli bir e-posta adresi giriniz'] };
    if (!findUniversityByEmail(normalizedEmail))
      throw { type: 'validation', errors: [`Yalnızca desteklenen üniversite e-postaları kullanılabilir: ${supportedDomainText()}`] };

    const generic = { message: 'Şifre sıfırlama kodu e-posta adresinize gönderildi' };
    const user = await this.db.get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) return generic;

    if (!this.emailService) {
      if (process.env.NODE_ENV === 'production') throw new Error('Email service is not configured');
      const devCode = this._generateResetCode();
      const devHash = bcrypt.hashSync(devCode, 10);
      await this.db.run(
        'UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
        [devHash, new Date(Date.now() + RESET_CODE_TTL_MS).toISOString(), user.id]
      );
      return { ...generic, devCode };
    }

    const code = this._generateResetCode();
    const hash = bcrypt.hashSync(code, 10);
    const expires = new Date(Date.now() + RESET_CODE_TTL_MS).toISOString();

    await this.db.run(
      'UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
      [hash, expires, user.id]
    );
    await this.emailService.sendPasswordResetCode(normalizedEmail, code, user.name);
    return generic;
  }

  async verifyResetCode(email, code) {
    const user = await this._getValidResetUser(email, code);
    return { message: 'Kod doğrulandı', email: user.email };
  }

  async resetPassword(email, code, password) {
    if (!password || password.length < 8)
      throw { type: 'validation', errors: ['Şifre en az 8 karakter olmalıdır'] };

    const user = await this._getValidResetUser(email, code);

    if (bcrypt.compareSync(password, user.password))
      throw { type: 'validation', errors: ['Yeni şifreniz son 3 şifrenizden farklı olmalıdır'] };

    const history = await this.db.all(
      'SELECT hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 2',
      [user.id]
    );
    for (const entry of history) {
      if (bcrypt.compareSync(password, entry.hash))
        throw { type: 'validation', errors: ['Yeni şifreniz son 3 şifrenizden farklı olmalıdır'] };
    }

    const newHash = bcrypt.hashSync(password, 10);

    await this.db.run(
      'INSERT INTO password_history (user_id, hash) VALUES (?, ?)',
      [user.id, user.password]
    );

    await this.db.run(
      `DELETE FROM password_history WHERE user_id = ? AND id NOT IN (
         SELECT id FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 2
       )`,
      [user.id, user.id]
    );

    await this.db.run(
      `UPDATE users SET password = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?`,
      [newHash, user.id]
    );

    return { message: 'Şifre güncellendi' };
  }

  async login(data) {
    if (!data.email || !data.password)
      throw { type: 'validation', errors: ['E-posta ve şifre zorunludur'] };

    const email = normalizeEmail(data.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !findUniversityByEmail(email))
      throw { type: 'auth', errors: ['E-posta veya şifre hatalı'] };

    const user = await this.db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(data.password, user.password))
      throw { type: 'auth', errors: ['E-posta veya şifre hatalı'] };

    if (this.emailService && !user.email_verified)
      throw { type: 'unverified', errors: ['E-posta adresinizi doğrulamanız gerekiyor'] };

    const safe = this._publicUser(user);
    return { user: safe, token: this._sign(safe) };
  }

  async getProfile(userId) {
    const user = await this.db.get(
      `SELECT id, email, name, department, faculty, phone, student_no, avatar,
              university_slug, university_name, university_domain, created_at
       FROM users WHERE id = ?`,
      [userId]
    );
    if (!user) throw { type: 'not_found', errors: ['Kullanıcı bulunamadı'] };
    return this._publicUser(user);
  }

  async getSessionUser(userId) {
    const user = await this.db.get(
      `SELECT id, email, name, department, faculty, phone, student_no, avatar,
              university_slug, university_name, university_domain, created_at
       FROM users WHERE id = ?`,
      [userId]
    );
    return user ? this._publicUser(user) : null;
  }

  async updateProfile(userId, data) {
    const errors = [];
    if (data.name !== undefined && data.name.trim().length < 2)
      errors.push('İsim en az 2 karakter olmalıdır');
    if (data.phone && !/^[0-9\s\+\-\(\)]{7,20}$/.test(data.phone.trim()))
      errors.push('Geçerli bir telefon numarası giriniz');
    if (errors.length > 0) throw { type: 'validation', errors };

    await this.db.run(`
      UPDATE users SET
        name       = COALESCE(?, name),
        department = ?,
        faculty    = ?,
        phone      = ?,
        student_no = ?,
        avatar     = ?
      WHERE id = ?
    `, [
      data.name?.trim() || null,
      data.department?.trim() || null,
      data.faculty || null,
      data.phone?.trim() || null,
      data.student_no?.trim() || null,
      data.avatar || null,
      userId,
    ]);

    return this.getProfile(userId);
  }

  verify(token) {
    return jwt.verify(token, JWT_SECRET);
  }

  _sign(user) {
    return jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      university_slug: user.university_slug,
    }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  }

  _generateResetCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 5; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }

  async _getValidResetUser(email, code) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !code || String(code).length !== 5)
      throw { type: 'validation', errors: ['Kod hatalı veya süresi dolmuş'] };

    const user = await this.db.get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user || !user.reset_token_hash || !user.reset_token_expires)
      throw { type: 'validation', errors: ['Kod hatalı veya süresi dolmuş'] };
    if (new Date(user.reset_token_expires) < new Date())
      throw { type: 'validation', errors: ['Kodun süresi dolmuş. Yeni kod talep edin.'] };
    if (!bcrypt.compareSync(String(code), user.reset_token_hash))
      throw { type: 'validation', errors: ['Kod hatalı veya süresi dolmuş'] };

    return user;
  }

  _publicUser(user) {
    const university = findUniversityBySlug(user.university_slug) || {
      slug: user.university_slug,
      name: user.university_name,
      shortName: user.university_name,
      domain: user.university_domain,
      logo: null,
    };

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department || null,
      faculty: user.faculty || null,
      phone: user.phone || null,
      student_no: user.student_no || null,
      avatar: user.avatar || null,
      university_slug: university.slug,
      university_name: university.name,
      university_domain: university.domain,
      university: publicUniversity(university),
      created_at: user.created_at,
    };
  }
}

module.exports = { AuthService };
