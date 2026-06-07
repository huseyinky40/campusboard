const express = require('express');
const { requireAdmin } = require('../middleware/admin');

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Yönetici paneli (is_admin gerekli)
 */

function createAdminRouter(controller) {
  const router = express.Router();
  router.use(requireAdmin);

  /**
   * @swagger
   * /api/admin/stats:
   *   get:
   *     summary: Dashboard istatistikleri
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: İstatistikler
   */
  router.get('/stats', (req, res) => controller.getStats(req, res));

  /**
   * @swagger
   * /api/admin/users:
   *   get:
   *     summary: Tüm kullanıcıları listele
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 30 }
   *     responses:
   *       200:
   *         description: Kullanıcı listesi
   */
  router.get('/users', (req, res) => controller.getUsers(req, res));

  /**
   * @swagger
   * /api/admin/users/{id}/ban:
   *   patch:
   *     summary: Kullanıcıyı banla
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   */
  router.patch('/users/:id/ban',   (req, res) => controller.banUser(req, res));

  /**
   * @swagger
   * /api/admin/users/{id}/unban:
   *   patch:
   *     summary: Kullanıcı banını kaldır
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   */
  router.patch('/users/:id/unban', (req, res) => controller.unbanUser(req, res));

  /**
   * @swagger
   * /api/admin/users/{id}:
   *   delete:
   *     summary: Kullanıcıyı sil
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   */
  router.delete('/users/:id', (req, res) => controller.deleteUser(req, res));

  /**
   * @swagger
   * /api/admin/listings:
   *   get:
   *     summary: Tüm ilanları listele
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: category
   *         schema: { type: string }
   *       - in: query
   *         name: status
   *         schema: { type: string }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   */
  router.get('/listings', (req, res) => controller.getListings(req, res));

  /**
   * @swagger
   * /api/admin/listings/{id}:
   *   delete:
   *     summary: İlanı sil
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   */
  router.delete('/listings/:id', (req, res) => controller.deleteListing(req, res));

  /**
   * @swagger
   * /api/admin/comments:
   *   get:
   *     summary: Tüm yorumları listele
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   */
  router.get('/comments', (req, res) => controller.getComments(req, res));

  /**
   * @swagger
   * /api/admin/comments/{id}:
   *   delete:
   *     summary: Yorumu sil
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   */
  router.delete('/comments/:id', (req, res) => controller.deleteComment(req, res));

  return router;
}

module.exports = { createAdminRouter };
