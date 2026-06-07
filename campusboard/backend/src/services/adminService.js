class AdminService {
  constructor(db) {
    this.db = db;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _sanitizePage(val)  { const n = parseInt(val, 10);  return (!isNaN(n) && n >= 1) ? n : 1; }
  _sanitizeLimit(val) { const n = parseInt(val, 10);  return (!isNaN(n) && n >= 1 && n <= 100) ? n : 30; }

  async _audit(adminId, action, targetType, targetId, details = {}) {
    try {
      await this.db.run(
        `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, action, targetType, targetId ?? null, JSON.stringify(details)],
      );
    } catch { /* audit failure must not break the main operation */ }
  }

  // ── Dashboard stats ───────────────────────────────────────────────────────

  async getStats() {
    const [users, listings, comments, activeListings, bannedUsers] = await Promise.all([
      this.db.get('SELECT COUNT(*) AS count FROM users'),
      this.db.get('SELECT COUNT(*) AS count FROM listings'),
      this.db.get('SELECT COUNT(*) AS count FROM comments'),
      this.db.get("SELECT COUNT(*) AS count FROM listings WHERE status = 'aktif'"),
      this.db.get('SELECT COUNT(*) AS count FROM users WHERE is_banned = TRUE'),
    ]);
    return {
      total_users:     Number(users?.count    || 0),
      total_listings:  Number(listings?.count  || 0),
      total_comments:  Number(comments?.count  || 0),
      active_listings: Number(activeListings?.count || 0),
      banned_users:    Number(bannedUsers?.count    || 0),
    };
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async getUsers({ search = '', page = 1, limit = 30 } = {}) {
    page  = this._sanitizePage(page);
    limit = this._sanitizeLimit(limit);
    const offset  = (page - 1) * limit;
    const pattern = `%${search}%`;
    const users = await this.db.all(
      `SELECT id, name, email, faculty, department, university_slug,
              email_verified, is_admin, is_banned, created_at
       FROM users
       WHERE name ILIKE ? OR email ILIKE ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [pattern, pattern, limit, offset],
    );
    const total = await this.db.get(
      'SELECT COUNT(*) AS count FROM users WHERE name ILIKE ? OR email ILIKE ?',
      [pattern, pattern],
    );
    return { users, total: Number(total?.count || 0) };
  }

  /** Lightweight list for frontend dropdown — no pagination, name+email only */
  async getUserList() {
    const users = await this.db.all(
      `SELECT id, name, email FROM users ORDER BY name ASC LIMIT 500`,
    );
    return { users };
  }

  async banUser(adminId, userId) {
    if (String(adminId) === String(userId)) throw { type: 'forbidden', message: 'Kendinizi banlayamazsınız' };
    const user = await this.db.get('SELECT id, name, email, is_admin FROM users WHERE id = ?', [userId]);
    if (!user) throw { type: 'not_found' };
    if (user.is_admin) throw { type: 'forbidden', message: 'Yönetici hesabı banlanamaz' };
    await this.db.run('UPDATE users SET is_banned = TRUE WHERE id = ?', [userId]);
    await this._audit(adminId, 'ban_user', 'user', userId, { name: user.name, email: user.email });
    return { banned: true };
  }

  async unbanUser(adminId, userId) {
    const user = await this.db.get('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    if (!user) throw { type: 'not_found' };
    await this.db.run('UPDATE users SET is_banned = FALSE WHERE id = ?', [userId]);
    await this._audit(adminId, 'unban_user', 'user', userId, { name: user.name, email: user.email });
    return { banned: false };
  }

  async deleteUser(adminId, userId) {
    if (String(adminId) === String(userId)) throw { type: 'forbidden', message: 'Kendi hesabınızı silemezsiniz' };
    const user = await this.db.get('SELECT id, name, email, is_admin FROM users WHERE id = ?', [userId]);
    if (!user) throw { type: 'not_found' };
    if (user.is_admin) throw { type: 'forbidden', message: 'Yönetici hesabı silinemez' };
    await this.db.run('DELETE FROM users WHERE id = ?', [userId]);
    await this._audit(adminId, 'delete_user', 'user', userId, { name: user.name, email: user.email });
    return { deleted: true };
  }

  // ── Listings ──────────────────────────────────────────────────────────────

  async getListings({ search = '', category = '', status = '', authorId = '', page = 1, limit = 30 } = {}) {
    page  = this._sanitizePage(page);
    limit = this._sanitizeLimit(limit);
    const offset  = (page - 1) * limit;
    const pattern = `%${search}%`;

    const conditions = ['(l.title ILIKE ? OR l.description ILIKE ?)'];
    const params     = [pattern, pattern];

    if (category) { conditions.push('l.category = ?');   params.push(category); }
    if (status)   { conditions.push('l.status = ?');     params.push(status); }
    if (authorId) { conditions.push('u.id = ?');         params.push(Number(authorId)); }

    const where = conditions.join(' AND ');

    const listings = await this.db.all(
      `SELECT l.id, l.title, l.description, l.category, l.status,
              l.created_at, l.expires_at, l.contact, l.image, l.view_count,
              u.id AS author_id, u.name AS author_name, u.email AS author_email
       FROM listings l
       JOIN users u ON u.id = l.user_id
       WHERE ${where}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const total = await this.db.get(
      `SELECT COUNT(*) AS count FROM listings l JOIN users u ON u.id = l.user_id WHERE ${where}`,
      params,
    );
    return { listings, total: Number(total?.count || 0) };
  }

  async deleteListing(adminId, listingId) {
    const listing = await this.db.get('SELECT id, title FROM listings WHERE id = ?', [listingId]);
    if (!listing) throw { type: 'not_found' };
    await this.db.run('DELETE FROM listings WHERE id = ?', [listingId]);
    await this._audit(adminId, 'delete_listing', 'listing', listingId, { title: listing.title });
    return { deleted: true };
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async getComments({ search = '', page = 1, limit = 30 } = {}) {
    page  = this._sanitizePage(page);
    limit = this._sanitizeLimit(limit);
    const offset  = (page - 1) * limit;
    const pattern = `%${search}%`;
    const comments = await this.db.all(
      `SELECT c.id, c.content, c.created_at, c.listing_id,
              u.name AS author_name, u.email AS author_email,
              l.title AS listing_title
       FROM comments c
       JOIN users u ON u.id = c.user_id
       JOIN listings l ON l.id = c.listing_id
       WHERE c.content ILIKE ?
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [pattern, limit, offset],
    );
    const total = await this.db.get(
      'SELECT COUNT(*) AS count FROM comments WHERE content ILIKE ?',
      [pattern],
    );
    return { comments, total: Number(total?.count || 0) };
  }

  async deleteComment(adminId, commentId) {
    const comment = await this.db.get(
      `SELECT c.id, c.content, u.email AS author_email
       FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [commentId],
    );
    if (!comment) throw { type: 'not_found' };
    await this.db.run('DELETE FROM comments WHERE id = ?', [commentId]);
    await this._audit(adminId, 'delete_comment', 'comment', commentId, {
      content_preview: comment.content.slice(0, 80),
      author_email: comment.author_email,
    });
    return { deleted: true };
  }

  // ── Audit logs ────────────────────────────────────────────────────────────

  async getAuditLogs({ page = 1, limit = 50 } = {}) {
    page  = this._sanitizePage(page);
    limit = this._sanitizeLimit(limit);
    const offset = (page - 1) * limit;
    const logs = await this.db.all(
      `SELECT al.id, al.action, al.target_type, al.target_id, al.details, al.created_at,
              u.name AS admin_name, u.email AS admin_email
       FROM audit_logs al
       JOIN users u ON u.id = al.admin_id
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    const total = await this.db.get('SELECT COUNT(*) AS count FROM audit_logs');
    return { logs, total: Number(total?.count || 0) };
  }
}

module.exports = { AdminService };
