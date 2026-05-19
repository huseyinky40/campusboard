const express = require('express');

/**
 * @swagger
 * components:
 *   schemas:
 *     Listing:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "Calculus II Ders Notu"
 *         description:
 *           type: string
 *           example: "Integral konularını kapsayan el yazısı notlar"
 *         category:
 *           type: string
 *           enum: [ders-notu, etkinlik, staj, ikinci-el, kayip-bulundu, genel]
 *           example: "ders-notu"
 *         faculty:
 *           type: string
 *           enum: [muhendislik, tip, hukuk, iktisat, egitim, fen-edebiyat, guzel-sanatlar, iletisim, diger]
 *           example: "muhendislik"
 *         status:
 *           type: string
 *           enum: [aktif, kapandi]
 *           example: "aktif"
 *         author_name:
 *           type: string
 *           example: "Ahmet Yılmaz"
 *         contact:
 *           type: string
 *           example: "ahmet@university.edu"
 *         created_at:
 *           type: string
 *           example: "2024-03-15 14:30:00"
 *         updated_at:
 *           type: string
 *           example: "2024-03-15 14:30:00"
 *
 *     ListingInput:
 *       type: object
 *       required: [title, description, category, faculty, author_name, contact]
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           example: "Calculus II Ders Notu"
 *         description:
 *           type: string
 *           minLength: 10
 *           maxLength: 2000
 *           example: "Integral konularını kapsayan el yazısı notlar, çok açıklayıcı"
 *         category:
 *           type: string
 *           enum: [ders-notu, etkinlik, staj, ikinci-el, kayip-bulundu, genel]
 *         faculty:
 *           type: string
 *           enum: [muhendislik, tip, hukuk, iktisat, egitim, fen-edebiyat, guzel-sanatlar, iletisim, diger]
 *         author_name:
 *           type: string
 *           example: "Ahmet Yılmaz"
 *         contact:
 *           type: string
 *           example: "ahmet@university.edu"
 *
 *     StatusInput:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           enum: [aktif, kapandi]
 *
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *
 *     ValidationError:
 *       type: object
 *       properties:
 *         errors:
 *           type: array
 *           items:
 *             type: string
 */

function createListingsRouter(controller) {
  const router = express.Router();

  /**
   * @swagger
   * /api/listings:
   *   get:
   *     summary: Tüm ilanları listele
   *     tags: [Listings]
   *     parameters:
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *           enum: [ders-notu, etkinlik, staj, ikinci-el, kayip-bulundu, genel]
   *         description: Kategoriye göre filtrele
   *       - in: query
   *         name: faculty
   *         schema:
   *           type: string
   *         description: Fakülteye göre filtrele
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [aktif, kapandi]
   *         description: Duruma göre filtrele
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Başlık, açıklama veya isimde arama yap
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Sayfa numarası
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 12
   *         description: Sayfa başına ilan sayısı (maks 50)
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
   * /api/listings/{id}:
   *   get:
   *     summary: Tek bir ilanı getir
   *     tags: [Listings]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Başarılı
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   $ref: '#/components/schemas/Listing'
   *       404:
   *         description: İlan bulunamadı
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/:id', (req, res) => controller.getById(req, res));

  /**
   * @swagger
   * /api/listings:
   *   post:
   *     summary: Yeni ilan oluştur
   *     tags: [Listings]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ListingInput'
   *     responses:
   *       201:
   *         description: İlan oluşturuldu
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   $ref: '#/components/schemas/Listing'
   *                 message:
   *                   type: string
   *       400:
   *         description: Validasyon hatası
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ValidationError'
   */
  router.post('/', (req, res) => controller.create(req, res));

  /**
   * @swagger
   * /api/listings/{id}:
   *   put:
   *     summary: İlanı güncelle
   *     tags: [Listings]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ListingInput'
   *     responses:
   *       200:
   *         description: Güncellendi
   *       400:
   *         description: Validasyon hatası
   *       404:
   *         description: İlan bulunamadı
   */
  router.put('/:id', (req, res) => controller.update(req, res));

  /**
   * @swagger
   * /api/listings/{id}/status:
   *   patch:
   *     summary: İlan durumunu güncelle (aktif/kapandi)
   *     tags: [Listings]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/StatusInput'
   *     responses:
   *       200:
   *         description: Durum güncellendi
   *       400:
   *         description: Geçersiz durum
   *       404:
   *         description: İlan bulunamadı
   */
  router.patch('/:id/status', (req, res) => controller.updateStatus(req, res));

  /**
   * @swagger
   * /api/listings/{id}:
   *   delete:
   *     summary: İlanı sil
   *     tags: [Listings]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: İlan silindi
   *       404:
   *         description: İlan bulunamadı
   */
  router.delete('/:id', (req, res) => controller.delete(req, res));

  /**
   * @swagger
   * /api/categories:
   *   get:
   *     summary: Geçerli kategorileri listele
   *     tags: [Meta]
   *     responses:
   *       200:
   *         description: Başarılı
   */
  // Not on listings router — mounted separately in app.js

  return router;
}

module.exports = { createListingsRouter };
