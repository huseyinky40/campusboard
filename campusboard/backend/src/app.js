const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const { createDb } = require('./db');
const { ListingService } = require('./services/listingService');
const { ListingController } = require('./controllers/listingController');
const { createListingsRouter } = require('./routes/listings');
const { AuthService } = require('./services/authService');
const { AuthController } = require('./controllers/authController');
const { EmailService } = require('./services/emailService');
const { createAuthRouter } = require('./routes/auth');
const { FavoriteService } = require('./services/favoriteService');
const { FavoriteController } = require('./controllers/favoriteController');
const { createFavoritesRouter } = require('./routes/favorites');
const { StatsService } = require('./services/statsService');
const { createStatsRouter } = require('./routes/stats');
const { requireAuth } = require('./middleware/auth');
const rateLimit = require('express-rate-limit');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CampusBoard API',
      version: '1.0.0',
      description: 'Öğrenci İlan Panosu — RESTful API (JWT korumalı)',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Geliştirme Sunucusu' }],
    tags: [
      { name: 'Auth', description: 'Kimlik doğrulama' },
      { name: 'Listings', description: 'İlan işlemleri (JWT gerekli)' },
      { name: 'Meta', description: 'Kategori ve fakülte listeleri' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: [path.join(__dirname, './routes/*.js')],
};

const defaultCorsOrigins = [
  'https://campusboard.app',
  'https://www.campusboard.app',
  'http://localhost:3000',
  'http://localhost:8080',
];

function corsOrigins() {
  const configured = process.env.CORS_ORIGINS;
  if (!configured) return defaultCorsOrigins;
  return [
    ...defaultCorsOrigins,
    ...configured.split(',').map(origin => origin.trim()).filter(Boolean),
  ];
}

async function createApp(dbPath) {
  const app = express();
  const db = await createDb(dbPath);

  const emailService = EmailService.isConfigured() ? new EmailService() : null;
  const authService = new AuthService(db, emailService);
  const authController = new AuthController(authService);

  const listingService = new ListingService(db);
  const listingController = new ListingController(listingService);

  const favoriteService = new FavoriteService(db);
  const favoriteController = new FavoriteController(favoriteService);

  const statsService = new StatsService(db);

  const authMiddleware = requireAuth(authService);

  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla istek gönderildi. Lütfen 15 dakika sonra tekrar deneyin.' },
  });
  const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.' },
  });

  app.set('trust proxy', 1);
  app.use(cors({
    origin: corsOrigins(),
    credentials: true,
  }));
  app.use(express.json());
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({
        error: 'Geçersiz JSON formatı',
        message: 'İstek gövdesindeki string değerleri çift tırnak içine alın. Örnek: "email": "mehmet@istanbularel.edu.tr"',
      });
    }
    next(err);
  });
  app.get('/favicon.ico', (req, res) => {
    res.type('image/svg+xml');
    res.sendFile(path.join(__dirname, '../../frontend/assets/campusboard_app_icon.svg'));
  });
  app.use(express.static(path.join(__dirname, '../../frontend')));

  if (process.env.NODE_ENV !== 'production') {
    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
  }

  app.use('/api', apiRateLimit);
  app.use('/api/auth', authRateLimit, createAuthRouter(authController, authService));
  app.use('/api/listings', authMiddleware, createListingsRouter(listingController));
  app.use('/api/favorites', authMiddleware, createFavoritesRouter(favoriteController));
  app.use('/api/stats', authMiddleware, createStatsRouter(statsService));

  app.get('/api', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/api/categories', (req, res) => listingController.getCategories(req, res));
  app.get('/api/faculties',  (req, res) => listingController.getFaculties(req, res));

  const frontendDir = path.join(__dirname, '../../frontend');
  app.get('/login',           (req, res) => res.sendFile(path.join(frontendDir, 'login.html')));
  app.get('/register',        (req, res) => res.sendFile(path.join(frontendDir, 'register.html')));
  app.get('/forgot-password', (req, res) => res.sendFile(path.join(frontendDir, 'forgot-password.html')));
  app.get('/reset-password',  (req, res) => res.sendFile(path.join(frontendDir, 'reset-password.html')));
  app.get('/app',             (req, res) => res.sendFile(path.join(frontendDir, 'app.html')));
  app.get('*',                (req, res) => res.sendFile(path.join(frontendDir, 'index.html')));

  return app;
}

module.exports = { createApp };
