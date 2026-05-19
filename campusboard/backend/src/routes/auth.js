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
 *         email:    { type: string, example: "ahmet@uni.edu" }
 *         password: { type: string, minLength: 6, example: "sifre123" }
 *     LoginInput:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:    { type: string, example: "ahmet@uni.edu" }
 *         password: { type: string, example: "sifre123" }
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
   * /api/auth/register:
   *   post:
   *     summary: Yeni kullanıcı kaydı
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/RegisterInput' }
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

  router.get('/profile',  requireAuth(authService), (req, res) => controller.getProfile(req, res));
  router.put('/profile',  requireAuth(authService), (req, res) => controller.updateProfile(req, res));

  return router;
}

module.exports = { createAuthRouter };
