const VALID_CATEGORIES = ['ders-notu', 'etkinlik', 'staj', 'ikinci-el', 'kayip-bulundu', 'genel'];
const VALID_FACULTIES = [
  'muhendislik', 'tip', 'hukuk', 'iktisat', 'egitim',
  'fen-edebiyat', 'guzel-sanatlar', 'iletisim', 'diger'
];
const VALID_STATUSES = ['aktif', 'kapandi'];

const CLOSED_RETENTION_DAYS = 30;

class ListingService {
  constructor(db) {
    this.db = db;
  }

  async getUserUniversitySlug(userId) {
    const user = await this.db.get('SELECT university_slug FROM users WHERE id = ?', [userId]);
    if (!user) throw { type: 'auth', errors: ['Kullanıcı bulunamadı'] };
    return user.university_slug;
  }

  async runCleanup() {
    // Delete listings whose expires_at has passed (regardless of status)
    await this.db.run(`
      DELETE FROM listings
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `, []);

    // Delete unlimited (no expires_at) closed listings after 30 days
    await this.db.run(`
      DELETE FROM listings
      WHERE status = 'kapandi'
        AND expires_at IS NULL
        AND closed_at IS NOT NULL
        AND closed_at < NOW() - INTERVAL '${CLOSED_RETENTION_DAYS} days'
    `, []);
  }

  validate(data) {
    const errors = [];
    if (!data.title || data.title.trim().length < 3)
      errors.push('Başlık en az 3 karakter olmalıdır');
    if (data.title && data.title.trim().length > 100)
      errors.push('Başlık en fazla 100 karakter olabilir');
    if (!data.description || data.description.trim().length < 10)
      errors.push('Açıklama en az 10 karakter olmalıdır');
    if (data.description && data.description.trim().length > 2000)
      errors.push('Açıklama en fazla 2000 karakter olabilir');
    if (!data.category || !VALID_CATEGORIES.includes(data.category))
      errors.push('Geçersiz kategori');
    if (!data.faculty || !VALID_FACULTIES.includes(data.faculty))
      errors.push('Geçersiz fakülte');
    if (!data.contact || data.contact.trim().length < 5)
      errors.push('İletişim bilgisi gereklidir');

    if (data.expires_at) {
      const d = new Date(data.expires_at);
      if (isNaN(d.getTime())) errors.push('Geçersiz bitiş tarihi formatı');
      else if (d.getFullYear() > 2050) errors.push('Bitiş tarihi 2050 yılını geçemez');
    }

    return errors;
  }

  async getAll(userId, filters = {}) {
    await this.runCleanup();
    const universitySlug = await this.getUserUniversitySlug(userId);

    let query = `
      SELECT l.*, u.name AS author_name, u.avatar AS author_avatar,
             CASE WHEN f.listing_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorited
      FROM listings l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN favorites f ON f.listing_id = l.id AND f.user_id = ?
      WHERE l.university_slug = ?`;
    const params = [userId, universitySlug];

    if (filters.mine) {
      query += ' AND l.user_id = ?'; params.push(userId);
    }
    if (filters.category && VALID_CATEGORIES.includes(filters.category)) {
      query += ' AND l.category = ?'; params.push(filters.category);
    }
    if (filters.faculty && VALID_FACULTIES.includes(filters.faculty)) {
      query += ' AND l.faculty = ?'; params.push(filters.faculty);
    }
    if (filters.status && VALID_STATUSES.includes(filters.status)) {
      query += ' AND l.status = ?'; params.push(filters.status);
    }
    if (filters.search && filters.search.trim().length > 0) {
      const term = `%${filters.search.trim()}%`;
      query += ' AND (l.title ILIKE ? OR l.description ILIKE ?)';
      params.push(term, term);
    }

    const countQuery = query.replace(
      /SELECT l\.\*, u\.name AS author_name, u\.avatar AS author_avatar,\s+CASE WHEN f\.listing_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorited/,
      'SELECT COUNT(*) AS total'
    );

    const PAGE_LIMIT = 12;
    const page  = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(filters.limit) || PAGE_LIMIT));
    const offset = (page - 1) * limit;

    const countResult = await this.db.get(countQuery, params);
    const total = Number(countResult.total);

    const rows = await this.db.all(query + ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?', [...params, limit, offset]);

    return {
      data:       rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSummary(userId, filters = {}) {
    await this.runCleanup();
    const universitySlug = await this.getUserUniversitySlug(userId);

    let query = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE
          WHEN l.status = 'aktif'
           AND l.expires_at IS NOT NULL
           AND DATE(l.expires_at) >= ?
           AND DATE(l.expires_at) <= ?
          THEN 1 ELSE 0 END) AS ending_soon,
        SUM(CASE WHEN l.status = 'kapandi' THEN 1 ELSE 0 END) AS closed
      FROM listings l
      JOIN users u ON u.id = l.user_id
      WHERE l.university_slug = ?`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const params = [
      today.toISOString().slice(0, 10),
      weekEnd.toISOString().slice(0, 10),
      universitySlug,
    ];

    if (filters.mine) {
      query += ' AND l.user_id = ?'; params.push(userId);
    }
    if (filters.category && VALID_CATEGORIES.includes(filters.category)) {
      query += ' AND l.category = ?'; params.push(filters.category);
    }
    if (filters.faculty && VALID_FACULTIES.includes(filters.faculty)) {
      query += ' AND l.faculty = ?'; params.push(filters.faculty);
    }
    if (filters.status && VALID_STATUSES.includes(filters.status)) {
      query += ' AND l.status = ?'; params.push(filters.status);
    }
    if (filters.search && filters.search.trim().length > 0) {
      const term = `%${filters.search.trim()}%`;
      query += ' AND (l.title ILIKE ? OR l.description ILIKE ?)';
      params.push(term, term);
    }

    const row = await this.db.get(query, params);

    return {
      total: Number(row.total) || 0,
      endingSoon: Number(row.ending_soon) || 0,
      closed: Number(row.closed) || 0,
    };
  }

  async getById(userId, id) {
    const universitySlug = await this.getUserUniversitySlug(userId);
    const listing = await this.db.get(`
      SELECT l.*, u.name AS author_name, u.avatar AS author_avatar,
             CASE WHEN f.listing_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorited
      FROM listings l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN favorites f ON f.listing_id = l.id AND f.user_id = ?
      WHERE l.id = ? AND l.university_slug = ?
    `, [userId, id, universitySlug]);

    if (listing) {
      const inserted = await this.db.run(
        'INSERT INTO listing_views (user_id, listing_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
        [userId, id]
      );
      if (inserted.rowCount > 0) {
        await this.db.run('UPDATE listings SET view_count = view_count + 1 WHERE id = ?', [id]);
        listing.view_count = Number(listing.view_count) + 1;
      }
    }

    return listing || null;
  }

  async getOwnedById(userId, id) {
    const universitySlug = await this.getUserUniversitySlug(userId);
    return this.db.get(`
      SELECT l.*, u.name AS author_name
      FROM listings l
      JOIN users u ON u.id = l.user_id
      WHERE l.id = ? AND l.user_id = ? AND l.university_slug = ?
    `, [id, userId, universitySlug]);
  }

  async create(userId, data) {
    const errors = this.validate(data);
    if (errors.length > 0) throw { type: 'validation', errors };
    const universitySlug = await this.getUserUniversitySlug(userId);

    const result = await this.db.run(`
      INSERT INTO listings (user_id, title, description, category, faculty, university_slug, contact, expires_at, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `, [
      userId,
      data.title.trim(),
      data.description.trim(),
      data.category,
      data.faculty,
      universitySlug,
      data.contact.trim(),
      data.expires_at || null,
      data.image || null,
    ]);

    return this.getById(userId, result.rows[0].id);
  }

  async update(userId, id, data) {
    if (!await this.getOwnedById(userId, id)) return null;
    const errors = this.validate(data);
    if (errors.length > 0) throw { type: 'validation', errors };

    await this.db.run(`
      UPDATE listings
      SET title = ?, description = ?, category = ?, faculty = ?,
          contact = ?, expires_at = ?, image = ?, updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `, [
      data.title.trim(),
      data.description.trim(),
      data.category,
      data.faculty,
      data.contact.trim(),
      data.expires_at || null,
      data.image !== undefined ? data.image : null,
      id,
      userId,
    ]);

    return this.getOwnedById(userId, id);
  }

  async updateStatus(userId, id, status) {
    if (!VALID_STATUSES.includes(status))
      throw { type: 'validation', errors: ['Geçersiz durum. Kabul edilenler: aktif, kapandi'] };
    if (!await this.getOwnedById(userId, id)) return null;

    const closedAt = status === 'kapandi' ? 'NOW()' : 'NULL';
    // When re-opening, clear expires_at if it's already in the past — otherwise runCleanup immediately closes it again
    const clearExpired = status === 'aktif'
      ? ', expires_at = CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN NULL ELSE expires_at END'
      : '';
    await this.db.run(
      `UPDATE listings SET status = ?, closed_at = ${closedAt}${clearExpired}, updated_at = NOW() WHERE id = ? AND user_id = ?`,
      [status, id, userId]
    );

    return this.getById(userId, id);
  }

  async delete(userId, id) {
    if (!await this.getOwnedById(userId, id)) return false;
    await this.db.run('DELETE FROM listings WHERE id = ? AND user_id = ?', [id, userId]);
    return true;
  }

  getCategories() { return VALID_CATEGORIES; }
  getFaculties()  { return VALID_FACULTIES; }
}

module.exports = { ListingService, VALID_CATEGORIES, VALID_FACULTIES, VALID_STATUSES };
