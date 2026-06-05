class CommentService {
  constructor(db) {
    this.db = db;
  }

  async _getUserUniversitySlug(userId) {
    const user = await this.db.get('SELECT university_slug FROM users WHERE id = ?', [userId]);
    if (!user) throw { type: 'auth', errors: ['Kullanıcı bulunamadı'] };
    return user.university_slug;
  }

  async getByListing(userId, listingId) {
    const universitySlug = await this._getUserUniversitySlug(userId);
    const listing = await this.db.get(
      'SELECT id, user_id FROM listings WHERE id = ? AND university_slug = ?',
      [listingId, universitySlug]
    );
    if (!listing) throw { type: 'not_found' };

    const comments = await this.db.all(`
      SELECT c.id, c.content, c.created_at, c.user_id,
             u.name AS author_name, u.avatar AS author_avatar
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.listing_id = ?
      ORDER BY c.created_at ASC
    `, [listingId]);

    return { comments, listing_owner_id: listing.user_id };
  }

  async create(userId, listingId, content) {
    const trimmed = (content || '').trim();
    if (trimmed.length < 2)
      throw { type: 'validation', errors: ['Yorum en az 2 karakter olmalıdır'] };
    if (trimmed.length > 500)
      throw { type: 'validation', errors: ['Yorum en fazla 500 karakter olabilir'] };

    const universitySlug = await this._getUserUniversitySlug(userId);
    const listing = await this.db.get(
      'SELECT id FROM listings WHERE id = ? AND university_slug = ?',
      [listingId, universitySlug]
    );
    if (!listing) throw { type: 'not_found' };

    const result = await this.db.run(
      'INSERT INTO comments (listing_id, user_id, content) VALUES (?, ?, ?) RETURNING id',
      [listingId, userId, trimmed]
    );
    const id = result.rows[0].id;

    return this.db.get(`
      SELECT c.id, c.content, c.created_at, c.user_id,
             u.name AS author_name, u.avatar AS author_avatar
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
    `, [id]);
  }

  async delete(userId, listingId, commentId) {
    const universitySlug = await this._getUserUniversitySlug(userId);
    const comment = await this.db.get(`
      SELECT c.id, c.user_id, l.user_id AS listing_owner_id
      FROM comments c
      JOIN listings l ON l.id = c.listing_id
      WHERE c.id = ? AND c.listing_id = ? AND l.university_slug = ?
    `, [commentId, listingId, universitySlug]);

    if (!comment) return false;
    if (comment.user_id !== userId && comment.listing_owner_id !== userId)
      throw { type: 'forbidden' };

    await this.db.run('DELETE FROM comments WHERE id = ?', [commentId]);
    return true;
  }
}

module.exports = { CommentService };
