const express = require('express');

/**
 * @swagger
 * tags:
 *   - name: Favorites
 *     description: Favori ilan işlemleri (JWT gerekli)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FavoriteToggleResult:
 *       type: object
 *       properties:
 *         favorited:
 *           type: boolean
 *           description: true = eklendi, false = çıkarıldı
 */

function createFavoritesRouter(controller) {
  const router = express.Router();

  /**
   * @swagger
   * /api/favorites:
   *   get:
   *     summary: Favori ilanları listele
   *     tags: [Favorites]
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
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Listing'
   *                 count:
   *                   type: integer
   */
  router.get('/', (req, res) => controller.getAll(req, res));

  /**
   * @swagger
   * /api/favorites/{listingId}:
   *   post:
   *     summary: İlanı favorilere ekle veya çıkar (toggle)
   *     tags: [Favorites]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: listingId
   *         required: true
   *         schema:
   *           type: integer
   *         description: İlan ID
   *     responses:
   *       200:
   *         description: Toggle başarılı
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/FavoriteToggleResult'
   *       404:
   *         description: İlan bulunamadı
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/:listingId', (req, res) => controller.toggle(req, res));

  return router;
}

module.exports = { createFavoritesRouter };
