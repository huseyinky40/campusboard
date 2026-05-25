const express = require('express');
const { getUniversityNews } = require('../services/universityService');

function createUniversityRouter() {
  const router = express.Router();

  /**
   * @openapi
   * /api/university/news:
   *   get:
   *     summary: Arel Üniversitesi haber akışı (RSS)
   *     tags: [University]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Haber listesi
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   title: { type: string }
   *                   link:  { type: string }
   *                   date:  { type: string, format: date-time }
   *                   description: { type: string }
   *       502:
   *         description: Üniversite sitesine erişilemedi
   */
  router.get('/news', async (req, res) => {
    try {
      const news = await getUniversityNews();
      res.json(news);
    } catch (err) {
      console.error('[university/news]', err.message);
      res.status(502).json({ error: 'Üniversite haber akışına şu an ulaşılamıyor.' });
    }
  });

  return router;
}

module.exports = { createUniversityRouter };
