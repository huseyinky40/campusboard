const express = require('express');

/**
 * @swagger
 * tags:
 *   - name: Comments
 *     description: İlan yorum işlemleri (JWT gerekli)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         listing_id:
 *           type: integer
 *           example: 5
 *         user_id:
 *           type: integer
 *           example: 3
 *         parent_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         content:
 *           type: string
 *           example: "Notlar hâlâ mevcut mu?"
 *         created_at:
 *           type: string
 *           example: "2026-06-05T10:00:00Z"
 *         author_name:
 *           type: string
 *           example: "Ahmet Yılmaz"
 *         author_avatar:
 *           type: string
 *           nullable: true
 *
 *     CommentInput:
 *       type: object
 *       required: [content]
 *       properties:
 *         content:
 *           type: string
 *           minLength: 2
 *           maxLength: 500
 *           example: "Notlar hâlâ mevcut mu?"
 *         parent_id:
 *           type: integer
 *           nullable: true
 *           description: Yanıt için üst yorum ID'si (isteğe bağlı)
 *           example: null
 */

function createCommentsRouter(controller) {
  const router = express.Router();

  /**
   * @swagger
   * /api/listings/{id}/comments:
   *   get:
   *     summary: İlana ait yorumları listele
   *     tags: [Comments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: İlan ID
   *     responses:
   *       200:
   *         description: Başarılı
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 comments:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Comment'
   *                 listing_owner_id:
   *                   type: integer
   *       404:
   *         description: İlan bulunamadı
   */
  router.get('/:id/comments', (req, res) => controller.getByListing(req, res));

  /**
   * @swagger
   * /api/listings/{id}/comments:
   *   post:
   *     summary: Yorum veya yanıt ekle
   *     tags: [Comments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: İlan ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CommentInput'
   *     responses:
   *       201:
   *         description: Yorum oluşturuldu
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   $ref: '#/components/schemas/Comment'
   *       400:
   *         description: Validasyon hatası
   *       404:
   *         description: İlan bulunamadı
   */
  router.post('/:id/comments', (req, res) => controller.create(req, res));

  /**
   * @swagger
   * /api/listings/{id}/comments/{commentId}:
   *   delete:
   *     summary: Yorum sil (yorum sahibi veya ilan sahibi)
   *     tags: [Comments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: İlan ID
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Yorum ID
   *     responses:
   *       200:
   *         description: Yorum silindi
   *       403:
   *         description: Bu yorumu silemezsiniz
   *       404:
   *         description: Yorum bulunamadı
   */
  router.delete('/:id/comments/:commentId', (req, res) => controller.delete(req, res));

  return router;
}

module.exports = { createCommentsRouter };
