class FavoriteService {
  constructor(db) {
    this.db = db;
  }

  async getUserUniversitySlug(userId) {
    const user = await this.db.get('SELECT university_slug FROM users WHERE id = ?', [userId]);
    if (!user) throw { type: 'auth', errors: ['Kullanıcı bulunamadı'] };
    return user.university_slug;
  }

  async getAll(userId) {
    const universitySlug = await this.getUserUniversitySlug(userId);
    return this.db.all(`
      SELECT l.*, u.name AS author_name, u.avatar AS author_avatar, 1 AS is_favorited
      FROM favorites f
      JOIN listings l ON l.id = f.listing_id
      JOIN users u ON u.id = l.user_id
      WHERE f.user_id = ? AND l.university_slug = ?
      ORDER BY f.created_at DESC
    `, [userId, universitySlug]);
  }

  async toggle(userId, listingId) {
    const universitySlug = await this.getUserUniversitySlug(userId);
    const listing = await this.db.get(
      'SELECT id FROM listings WHERE id = ? AND university_slug = ?',
      [listingId, universitySlug]
    );
    if (!listing) return null;

    const exists = await this.db.get(
      'SELECT 1 FROM favorites WHERE user_id = ? AND listing_id = ?',
      [userId, listingId]
    );

    if (exists) {
      await this.db.run('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?', [userId, listingId]);
      return { favorited: false };
    } else {
      await this.db.run(
        'INSERT INTO favorites (user_id, listing_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
        [userId, listingId]
      );
      return { favorited: true };
    }
  }
}

module.exports = { FavoriteService };
