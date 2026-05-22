class StatsService {
  constructor(db) {
    this.db = db;
  }

  async getStats(universitySlug) {
    const scope = universitySlug ? 'WHERE university_slug = ?' : '';
    const params = universitySlug ? [universitySlug] : [];

    const totals = await this.db.get(`
      SELECT
        COUNT(*)                                                    AS total_listings,
        SUM(CASE WHEN status = 'aktif'   THEN 1 ELSE 0 END)       AS active_listings,
        SUM(CASE WHEN status = 'kapandi' THEN 1 ELSE 0 END)       AS closed_listings,
        SUM(view_count)                                            AS total_views
      FROM listings
      ${scope}
    `, params);

    const byCategory = await this.db.all(`
      SELECT category, COUNT(*) AS count
      FROM listings ${scope} GROUP BY category ORDER BY count DESC
    `, params);

    const byFaculty = await this.db.all(`
      SELECT faculty, COUNT(*) AS count
      FROM listings ${scope} GROUP BY faculty ORDER BY count DESC
    `, params);

    const usersRow = await this.db.get(
      universitySlug ? 'SELECT COUNT(*) AS count FROM users WHERE university_slug = ?' : 'SELECT COUNT(*) AS count FROM users',
      params
    );
    const favsRow  = await this.db.get(`
      SELECT COUNT(*) AS count
      FROM favorites f
      JOIN listings l ON l.id = f.listing_id
      ${scope ? 'WHERE l.university_slug = ?' : ''}
    `, params);

    return {
      total_listings:  Number(totals.total_listings),
      active_listings: Number(totals.active_listings),
      closed_listings: Number(totals.closed_listings),
      total_views:     Number(totals.total_views) || 0,
      total_users:     Number(usersRow.count),
      total_favorites: Number(favsRow.count),
      by_category:     Object.fromEntries(byCategory.map(r => [r.category, Number(r.count)])),
      by_faculty:      Object.fromEntries(byFaculty.map(r => [r.faculty,   Number(r.count)])),
    };
  }
}

module.exports = { StatsService };
