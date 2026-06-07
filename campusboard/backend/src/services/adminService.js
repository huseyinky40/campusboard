class AdminService {
  constructor(db) {
    this.db = db;
  }

  // ── Dashboard stats ─────────────────────────────────────────────────────────

  async getStats() {
    const [users, listings, comments, activeListings, bannedUsers] = await Promise.all([
      this.db.get('SELECT COUNT(*) AS count FROM users'),
      this.db.get('SELECT COUNT(*) AS count FROM listings'),
      this.db.get('SELECT COUNT(*) AS count FROM comments'),
      this.db.get("SELECT COUNT(*) AS count FROM listings WHERE status = 'aktif'"),
      this.db.get('SELECT COUNT(*) AS count FROM users WHERE is_banned = TRUE'),
    ]);
    return {
      total_users:      Number(users?.count    || 0),
      total_listings:   Number(listings?.count  || 0),
      total_comments:   Number(comments?.count  || 0),
      active_listings:  Number(activeListings?.count || 0),
      banned_users:     Number(bannedUsers?.count || 0),
    };
  }

  // ── Users ───────────────────────────────────────────────────────────────────

  async getUsers({ search = '', page = 1, limit = 30 } = {}) {
    const offset = (page - 1) * limit;
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

  async banUser(adminId, userId) {
    if (String(adminId) === String(userId)) throw { type: 'forbidden', message: 'Kendinizi banlayamazsınız' };
    const user = await this.db.get('SELECT id, is_admin FROM users WHERE id = ?', [userId]);
    if (!user) throw { type: 'not_found' };
    if (user.is_admin) throw { type: 'forbidden', message: 'Yönetici hesabı banlanamaz' };
    await this.db.run('UPDATE users SET is_banned = TRUE WHERE id = ?', [userId]);
    return { banned: true };
  }

  async unbanUser(userId) {
    const user = await this.db.get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) throw { type: 'not_found' };
    await this.db.run('UPDATE users SET is_banned = FALSE WHERE id = ?', [userId]);
    return { banned: false };
  }

  async deleteUser(adminId, userId) {
    if (String(adminId) === String(userId)) throw { type: 'forbidden', message: 'Kendi hesabınızı silemezsiniz' };
    const user = await this.db.get('SELECT id, is_admin FROM users WHERE id = ?', [userId]);
    if (!user) throw { type: 'not_found' };
    if (user.is_admin) throw { type: 'forbidden', message: 'Yönetici hesabı silinemez' };
    await this.db.run('DELETE FROM users WHERE id = ?', [userId]);
    return { deleted: true };
  }

  // ── Listings ────────────────────────────────────────────────────────────────

  async getListings({ search = '', category = '', status = '', page = 1, limit = 30 } = {}) {
    const offset = (page - 1) * limit;
    const pattern = `%${search}%`;
    const conditions = ['(l.title ILIKE ? OR l.description ILIKE ?)'];
    const params = [pattern, pattern];
    if (category) { conditions.push('l.category = ?'); params.push(category); }
    if (status)   { conditions.push('l.status = ?');   params.push(status); }
    const where = conditions.join(' AND ');

    const listings = await this.db.all(
      `SELECT l.id, l.title, l.category, l.status, l.created_at, l.view_count,
              u.name AS author_name, u.email AS author_email
       FROM listings l
       JOIN users u ON u.id = l.user_id
       WHERE ${where}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const total = await this.db.get(
      `SELECT COUNT(*) AS count FROM listings l WHERE ${where}`,
      params,
    );
    return { listings, total: Number(total?.count || 0) };
  }

  async deleteListing(listingId) {
    const listing = await this.db.get('SELECT id FROM listings WHERE id = ?', [listingId]);
    if (!listing) throw { type: 'not_found' };
    await this.db.run('DELETE FROM listings WHERE id = ?', [listingId]);
    return { deleted: true };
  }

  // ── Comments ────────────────────────────────────────────────────────────────

  async getComments({ search = '', page = 1, limit = 30 } = {}) {
    const offset = (page - 1) * limit;
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

  async deleteComment(commentId) {
    const comment = await this.db.get('SELECT id FROM comments WHERE id = ?', [commentId]);
    if (!comment) throw { type: 'not_found' };
    await this.db.run('DELETE FROM comments WHERE id = ?', [commentId]);
    return { deleted: true };
  }
}

module.exports = { AdminService };
