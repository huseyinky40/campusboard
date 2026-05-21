const express = require('express');

function createStatsRouter(statsService) {
  const router = express.Router();

  /**
   * @swagger
   * /api/stats:
   *   get:
   *     summary: Platform istatistiklerini getir
   *     tags: [Meta]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Başarılı
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 total_listings:
   *                   type: integer
   *                 active_listings:
   *                   type: integer
   *                 closed_listings:
   *                   type: integer
   *                 total_views:
   *                   type: integer
   *                 total_users:
   *                   type: integer
   *                 total_favorites:
   *                   type: integer
   *                 by_category:
   *                   type: object
   *                 by_faculty:
   *                   type: object
   */
  router.get('/', async (req, res) => {
    try {
      const stats = await statsService.getStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  });

  return router;
}

module.exports = { createStatsRouter };
