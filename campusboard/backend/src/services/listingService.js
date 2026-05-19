const VALID_CATEGORIES = ['ders-notu', 'etkinlik', 'staj', 'ikinci-el', 'kayip-bulundu', 'genel'];
const VALID_FACULTIES = [
  'muhendislik', 'tip', 'hukuk', 'iktisat', 'egitim',
  'fen-edebiyat', 'guzel-sanatlar', 'iletisim', 'diger'
];
const VALID_STATUSES = ['aktif', 'kapandi'];

// Listings closed for more than this many days are auto-deleted
const CLOSED_RETENTION_DAYS = 30;

class ListingService {
  constructor(db) {
    this.db = db;
  }

  // ── Lazy cleanup ─────────────────────────────────────────────────────────
  // Called before any read so expired/stale rows are cleaned up on-demand.
  runCleanup() {
    const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // 1. Auto-close active listings whose expires_at has passed
    this.db.prepare(`
      UPDATE listings
      SET status    = 'kapandi',
          closed_at = datetime('now','localtime'),
          updated_at = datetime('now','localtime')
      WHERE status = 'aktif'
        AND expires_at IS NOT NULL
        AND expires_at < ?
    `).run(now);

    // 2. Hard-delete kapandı listings closed more than 30 days ago
    this.db.prepare(`
      DELETE FROM listings
      WHERE status = 'kapandi'
        AND closed_at IS NOT NULL
        AND julianday('now','localtime') - julianday(closed_at) > ?
    `).run(CLOSED_RETENTION_DAYS);
  }

  // ── Validation ────────────────────────────────────────────────────────────
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

  // ── Queries ───────────────────────────────────────────────────────────────
  getAll(userId, filters = {}) {
    this.runCleanup();

    let query = `
      SELECT l.*, u.name AS author_name, u.avatar AS author_avatar,
             CASE WHEN f.listing_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorited
      FROM listings l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN favorites f ON f.listing_id = l.id AND f.user_id = ?
      WHERE 1=1`;
    const params = [userId];

    // ?mine=true → sadece giriş yapan kullanıcının ilanları
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
      query += ' AND (l.title LIKE ? OR l.description LIKE ?)';
      params.push(term, term);
    }

    query += ' ORDER BY l.created_at DESC';

    const PAGE_LIMIT = 12;
    const page  = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(filters.limit) || PAGE_LIMIT));
    const offset = (page - 1) * limit;

    const countQuery = query.replace(
      /SELECT l\.\*, u\.name AS author_name, u\.avatar AS author_avatar,\s+CASE WHEN f\.listing_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorited/,
      'SELECT COUNT(*) AS total'
    );
    const { total } = this.db.prepare(countQuery).get(params);

    const rows = this.db.prepare(query + ' LIMIT ? OFFSET ?').all([...params, limit, offset]);

    return {
      data:       rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  getById(userId, id) {
    const listing = this.db.prepare(`
      SELECT l.*, u.name AS author_name, u.avatar AS author_avatar,
             CASE WHEN f.listing_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorited
      FROM listings l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN favorites f ON f.listing_id = l.id AND f.user_id = ?
      WHERE l.id = ?
    `).get(userId, id) || null;

    if (listing) {
      const inserted = this.db.prepare(
        'INSERT OR IGNORE INTO listing_views (user_id, listing_id) VALUES (?, ?)'
      ).run(userId, id);
      if (inserted.changes > 0) {
        this.db.prepare('UPDATE listings SET view_count = view_count + 1 WHERE id = ?').run(id);
        listing.view_count += 1;
      }
    }

    return listing;
  }

  getOwnedById(userId, id) {
    return this.db.prepare(`
      SELECT l.*, u.name AS author_name
      FROM listings l
      JOIN users u ON u.id = l.user_id
      WHERE l.id = ? AND l.user_id = ?
    `).get(id, userId) || null;
  }

  // ── Write operations ──────────────────────────────────────────────────────
  create(userId, data) {
    const errors = this.validate(data);
    if (errors.length > 0) throw { type: 'validation', errors };

    const expiresAt = data.expires_at || null;

    const result = this.db.prepare(`
      INSERT INTO listings (user_id, title, description, category, faculty, contact, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      data.title.trim(),
      data.description.trim(),
      data.category,
      data.faculty,
      data.contact.trim(),
      expiresAt
    );

    return this.getById(userId, result.lastInsertRowid);
  }

  update(userId, id, data) {
    if (!this.getOwnedById(userId, id)) return null;
    const errors = this.validate(data);
    if (errors.length > 0) throw { type: 'validation', errors };

    const expiresAt = data.expires_at || null;

    this.db.prepare(`
      UPDATE listings
      SET title = ?, description = ?, category = ?, faculty = ?,
          contact = ?, expires_at = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ? AND user_id = ?
    `).run(
      data.title.trim(),
      data.description.trim(),
      data.category,
      data.faculty,
      data.contact.trim(),
      expiresAt,
      id,
      userId
    );

    return this.getOwnedById(userId, id);
  }

  updateStatus(userId, id, status) {
    if (!VALID_STATUSES.includes(status))
      throw { type: 'validation', errors: ['Geçersiz durum. Kabul edilenler: aktif, kapandi'] };
    if (!this.getOwnedById(userId, id)) return null;

    // Track when a listing is manually closed
    const closedAt = status === 'kapandi' ? "datetime('now','localtime')" : 'NULL';
    this.db.prepare(`
      UPDATE listings
      SET status = ?, closed_at = ${closedAt}, updated_at = datetime('now','localtime')
      WHERE id = ? AND user_id = ?
    `).run(status, id, userId);

    return this.getById(userId, id);
  }

  delete(userId, id) {
    if (!this.getOwnedById(userId, id)) return false;
    this.db.prepare('DELETE FROM listings WHERE id = ? AND user_id = ?').run(id, userId);
    return true;
  }

  getCategories() { return VALID_CATEGORIES; }
  getFaculties()  { return VALID_FACULTIES; }
}

module.exports = { ListingService, VALID_CATEGORIES, VALID_FACULTIES, VALID_STATUSES };
