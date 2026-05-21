const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }
  return 'campusboard-dev-secret-change-me';
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES = '7d';

class AuthService {
  constructor(db) {
    this.db = db;
  }

  validateRegister(data) {
    const errors = [];
    if (!data.name || !/^[^\s]+\s+[^\s]+/.test(data.name.trim()))
      errors.push('Ad ve soyad birlikte yazın');
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      errors.push('Geçerli bir e-posta adresi giriniz');
    if (!data.password || data.password.length < 8)
      errors.push('Şifre en az 8 karakter olmalıdır');
    return errors;
  }

  async register(data) {
    const errors = this.validateRegister(data);
    if (errors.length > 0) throw { type: 'validation', errors };

    const existing = await this.db.get('SELECT id FROM users WHERE email = ?', [data.email.toLowerCase()]);
    if (existing) throw { type: 'validation', errors: ['Bu e-posta adresi zaten kayıtlı'] };

    const hash = bcrypt.hashSync(data.password, 10);
    const result = await this.db.run(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?) RETURNING id',
      [data.email.toLowerCase(), hash, data.name.trim()]
    );
    const newId = result.rows[0].id;

    const user = await this.db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [newId]);
    return { user, token: this._sign(user) };
  }

  async login(data) {
    if (!data.email || !data.password)
      throw { type: 'validation', errors: ['E-posta ve şifre zorunludur'] };

    const user = await this.db.get('SELECT * FROM users WHERE email = ?', [data.email.toLowerCase()]);
    if (!user || !bcrypt.compareSync(data.password, user.password))
      throw { type: 'auth', errors: ['E-posta veya şifre hatalı'] };

    const { password: _, ...safe } = user;
    return { user: safe, token: this._sign(safe) };
  }

  async getProfile(userId) {
    const user = await this.db.get(
      'SELECT id, email, name, department, faculty, phone, student_no, avatar, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (!user) throw { type: 'not_found', errors: ['Kullanıcı bulunamadı'] };
    return user;
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
    return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  }
}

module.exports = { AuthService };
