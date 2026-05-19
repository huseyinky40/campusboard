const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'campusboard-secret-key-2024';
const JWT_EXPIRES = '7d';

class AuthService {
  constructor(db) {
    this.db = db;
  }

  validateRegister(data) {
    const errors = [];
    if (!data.name || data.name.trim().length < 2)
      errors.push('İsim en az 2 karakter olmalıdır');
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      errors.push('Geçerli bir e-posta adresi giriniz');
    if (!data.password || data.password.length < 6)
      errors.push('Şifre en az 6 karakter olmalıdır');
    return errors;
  }

  register(data) {
    const errors = this.validateRegister(data);
    if (errors.length > 0) throw { type: 'validation', errors };

    const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(data.email.toLowerCase());
    if (existing) throw { type: 'validation', errors: ['Bu e-posta adresi zaten kayıtlı'] };

    const hash = bcrypt.hashSync(data.password, 10);
    const result = this.db.prepare(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)'
    ).run(data.email.toLowerCase(), hash, data.name.trim());

    const user = this.db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    return { user, token: this._sign(user) };
  }

  login(data) {
    if (!data.email || !data.password)
      throw { type: 'validation', errors: ['E-posta ve şifre zorunludur'] };

    const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(data.email.toLowerCase());
    if (!user || !bcrypt.compareSync(data.password, user.password))
      throw { type: 'auth', errors: ['E-posta veya şifre hatalı'] };

    const { password: _, ...safe } = user;
    return { user: safe, token: this._sign(safe) };
  }

  getProfile(userId) {
    const user = this.db.prepare(
      'SELECT id, email, name, department, faculty, phone, student_no, avatar, created_at FROM users WHERE id = ?'
    ).get(userId);
    if (!user) throw { type: 'not_found', errors: ['Kullanıcı bulunamadı'] };
    return user;
  }

  updateProfile(userId, data) {
    const errors = [];
    if (data.name !== undefined && data.name.trim().length < 2)
      errors.push('İsim en az 2 karakter olmalıdır');
    if (data.phone && !/^[0-9\s\+\-\(\)]{7,20}$/.test(data.phone.trim()))
      errors.push('Geçerli bir telefon numarası giriniz');
    if (errors.length > 0) throw { type: 'validation', errors };

    this.db.prepare(`
      UPDATE users SET
        name       = COALESCE(?, name),
        department = ?,
        faculty    = ?,
        phone      = ?,
        student_no = ?,
        avatar     = ?
      WHERE id = ?
    `).run(
      data.name?.trim() || null,
      data.department?.trim() || null,
      data.faculty || null,
      data.phone?.trim() || null,
      data.student_no?.trim() || null,
      data.avatar || null,
      userId
    );

    return this.getProfile(userId);
  }

  verify(token) {
    return jwt.verify(token, JWT_SECRET);
  }

  _sign(user) {
    return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  }
}

module.exports = { AuthService };
