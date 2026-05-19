class FavoriteService {
  constructor(db) {
    this.db = db;
  }

  getAll(userId) {
    return this.db.prepare(`
      SELECT l.*, u.name AS author_name, u.avatar AS author_avatar, 1 AS is_favorited
      FROM favorites f
      JOIN listings l ON l.id = f.listing_id
      JOIN users u ON u.id = l.user_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(userId);
  }

  toggle(userId, listingId) {
    const listing = this.db.prepare('SELECT id FROM listings WHERE id = ?').get(listingId);
    if (!listing) return null;

    const exists = this.db.prepare(
      'SELECT 1 FROM favorites WHERE user_id = ? AND listing_id = ?'
    ).get(userId, listingId);

    if (exists) {
      this.db.prepare('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?').run(userId, listingId);
      return { favorited: false };
    } else {
      this.db.prepare('INSERT INTO favorites (user_id, listing_id) VALUES (?, ?)').run(userId, listingId);
      return { favorited: true };
    }
  }
}

module.exports = { FavoriteService };
