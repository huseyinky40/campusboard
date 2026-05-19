class StatsService {
  constructor(db) {
    this.db = db;
  }

  getStats() {
    const totals = this.db.prepare(`
      SELECT
        COUNT(*)                                      AS total_listings,
        SUM(CASE WHEN status = 'aktif'   THEN 1 ELSE 0 END) AS active_listings,
        SUM(CASE WHEN status = 'kapandi' THEN 1 ELSE 0 END) AS closed_listings,
        SUM(view_count)                               AS total_views
      FROM listings
    `).get();

    const byCategory = this.db.prepare(`
      SELECT category, COUNT(*) AS count
      FROM listings GROUP BY category ORDER BY count DESC
    `).all();

    const byFaculty = this.db.prepare(`
      SELECT faculty, COUNT(*) AS count
      FROM listings GROUP BY faculty ORDER BY count DESC
    `).all();

    const totalUsers = this.db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    const totalFavorites = this.db.prepare('SELECT COUNT(*) AS count FROM favorites').get().count;

    return {
      total_listings:  totals.total_listings,
      active_listings: totals.active_listings,
      closed_listings: totals.closed_listings,
      total_views:     totals.total_views || 0,
      total_users:     totalUsers,
      total_favorites: totalFavorites,
      by_category:     Object.fromEntries(byCategory.map(r => [r.category, r.count])),
      by_faculty:      Object.fromEntries(byFaculty.map(r => [r.faculty, r.count])),
    };
  }
}

module.exports = { StatsService };
