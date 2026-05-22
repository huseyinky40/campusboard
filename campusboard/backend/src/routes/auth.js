const express = require('express');
const { requireAuth } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     RegisterInput:
 *       type: object
 *       required: [name, email, password]
 *       properties:
 *         name:     { type: string, example: "Ahmet Yılmaz" }
 *         email:    { type: string, example: "ahmet@istanbularel.edu.tr" }
 *         password: { type: string, minLength: 8, example: "sifre1234" }
 *     LoginInput:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:    { type: string, example: "ahmet@istanbularel.edu.tr" }
 *         password: { type: string, example: "sifre1234" }
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:   { type: string }
 *         user:
 *           type: object
 *           properties:
 *             id:    { type: integer }
 *             email: { type: string }
 *             name:  { type: string }
 *         message: { type: string }
 */

function createAuthRouter(controller, authService) {
  const router = express.Router();

  /**
   * @swagger
   * /api/auth/universities:
   *   get:
   *     summary: Desteklenen üniversiteleri listele
   *     tags: [Auth]
   *     responses:
   *       200:
   *         description: Desteklenen üniversite listesi
   */
  router.get('/universities', (req, res) => controller.universities(req, res));

  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Yeni kullanıcı kaydı
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/RegisterInput' }
   *           example:
   *             name: "Mehmet Yıldırım"
   *             email: "mehmet@istanbularel.edu.tr"
   *             password: "sifre1234"
   *     responses:
   *       201:
   *         description: Kayıt başarılı
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/AuthResponse' }
   *       400:
   *         description: Validasyon hatası
   */
  router.post('/register', (req, res) => controller.register(req, res));

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Kullanıcı girişi
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/LoginInput' }
   *           example:
   *             email: "mehmet@istanbularel.edu.tr"
   *             password: "sifre1234"
   *     responses:
   *       200:
   *         description: Giriş başarılı
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/AuthResponse' }
   *       401:
   *         description: Hatalı kimlik bilgileri
   */
  router.post('/login', (req, res) => controller.login(req, res));

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: Mevcut kullanıcı bilgisi
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Kullanıcı bilgisi
   *       401:
   *         description: Token gerekli
   */
  router.get('/me', requireAuth(authService), (req, res) => controller.me(req, res));

  /**
   * @swagger
   * /api/auth/profile:
   *   get:
   *     summary: Geniş kullanıcı profili getir
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profil bilgisi
   *       401:
   *         description: Token gerekli
   *       404:
   *         description: Kullanıcı bulunamadı
   */
  router.get('/profile',  requireAuth(authService), (req, res) => controller.getProfile(req, res));

  /**
   * @swagger
   * /api/auth/profile:
   *   put:
   *     summary: Kullanıcı profilini güncelle
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:       { type: string, example: "Ahmet Yılmaz" }
   *               department: { type: string, example: "Bilgisayar Mühendisliği" }
   *               faculty:    { type: string, example: "muhendislik" }
   *               phone:      { type: string, example: "05001234567" }
   *               student_no: { type: string, example: "20190001" }
   *     responses:
   *       200:
   *         description: Profil güncellendi
   *       400:
   *         description: Validasyon hatası
   *       401:
   *         description: Token gerekli
   */
  router.put('/profile',  requireAuth(authService), (req, res) => controller.updateProfile(req, res));

  /**
   * @swagger
   * /api/auth/verify-email:
   *   post:
   *     summary: E-posta doğrulama kodu doğrula
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, code]
   *             properties:
   *               email: { type: string, example: "ahmet@istanbularel.edu.tr" }
   *               code:  { type: string, example: "123456" }
   *     responses:
   *       200:
   *         description: Doğrulama başarılı — JWT döner
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/AuthResponse' }
   *       400:
   *         description: Hatalı veya süresi dolmuş kod
   */
  router.post('/verify-email', (req, res) => controller.verifyEmail(req, res));

  /**
   * @swagger
   * /api/auth/resend-verify:
   *   post:
   *     summary: Doğrulama kodunu yeniden gönder
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email: { type: string, example: "ahmet@istanbularel.edu.tr" }
   *     responses:
   *       200:
   *         description: Yeni kod gönderildi
   *       400:
   *         description: E-posta bulunamadı veya zaten doğrulanmış
   */
  router.post('/resend-verify', (req, res) => controller.resendVerify(req, res));

  /**
   * @swagger
   * /api/auth/forgot-password:
   *   post:
   *     summary: Şifre sıfırlama kodu gönder
   *     tags: [Auth]
   */
  router.post('/forgot-password', (req, res) => controller.forgotPassword(req, res));

  /**
   * @swagger
   * /api/auth/verify-reset-code:
   *   post:
   *     summary: Şifre sıfırlama kodunu doğrula
   *     tags: [Auth]
   */
  router.post('/verify-reset-code', (req, res) => controller.verifyResetCode(req, res));

  /**
   * @swagger
   * /api/auth/reset-password:
   *   post:
   *     summary: Yeni şifre belirle
   *     tags: [Auth]
   */
  router.post('/reset-password', (req, res) => controller.resetPassword(req, res));

  return router;
}

module.exports = { createAuthRouter };
