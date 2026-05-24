# CampusBoard • Student Bulletin Board

A JWT-protected full-stack student bulletin board for university communities. Students can share course notes, events, internships, second-hand items, lost & found posts, and general announcements — all behind university email verification.

**Live:** https://campusboard.app  
**Swagger:** http://localhost:3000/api-docs *(development only)*

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript (SPA), HTML5, CSS3 |
| Backend | Node.js + Express |
| Database | PostgreSQL (production) · SQLite in-memory (tests) |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| Email | Resend API |
| API Documentation | Swagger UI (OpenAPI 3.0) |
| Testing | Jest |
| Security | express-rate-limit |
| Deployment | Vercel (frontend) · Railway (backend + PostgreSQL) |

---

## Setup

### Requirements

- Node.js v18+
- npm
- PostgreSQL (for local development with persistent data)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/huseyinky40/campusboard.git
cd campusboard

# 2. Install backend dependencies
cd campusboard/backend
npm install

# 3. Create .env file
cp .env.example .env   # then fill in your values

# 4. Start the server
npm start
```

App: `http://localhost:3000`  
Swagger UI: `http://localhost:3000/api-docs`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (or `:memory:` for SQLite) | Yes |
| `JWT_SECRET` | Token signing secret | Yes (production) |
| `RESEND_API_KEY` | Resend API key for transactional email | Yes (production) |
| `EMAIL_FROM` | Sender address (e.g. `no-reply@campusboard.app`) | Yes (production) |
| `CORS_ORIGINS` | Allowed origins, comma-separated | No |

> **Local dev shortcut:** Set `DATABASE_URL=:memory:` in `.env` to use an in-memory SQLite database with no external dependencies.

### Development Mode (auto-reload)

```bash
npm run dev
```

### Seed Test Data

Populate the database with 3 test users and 26 sample listings:

```bash
DATABASE_URL="postgresql://..." node seed.js
```

Test user credentials: `Test1234!` (all three accounts)

### Run Tests

```bash
cd campusboard/backend
npm test
```

96 tests · 3 files · ListingService · AuthService · FavoriteService

---

## Project Structure

```
campusboard/
├── backend/
│   ├── src/
│   │   ├── db.js                    # PostgreSQL/SQLite adapter, schema creation
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT verification middleware
│   │   ├── services/
│   │   │   ├── listingService.js    # Listing business logic, filtering, pagination
│   │   │   ├── authService.js       # Register, login, forgot/reset password, email verification
│   │   │   ├── favoriteService.js   # Favorite toggle and listing
│   │   │   ├── emailService.js      # Resend-based transactional email templates
│   │   │   └── statsService.js      # Platform statistics
│   │   ├── controllers/
│   │   │   ├── listingController.js # Listing HTTP layer
│   │   │   ├── authController.js    # Auth HTTP layer
│   │   │   └── favoriteController.js# Favorite HTTP layer
│   │   ├── routes/
│   │   │   ├── listings.js          # Listing routes (JWT protected)
│   │   │   ├── auth.js              # Auth routes (rate-limited)
│   │   │   ├── favorites.js         # Favorite routes (JWT protected)
│   │   │   └── stats.js             # Stats routes (JWT protected)
│   │   └── app.js                   # Express app setup
│   ├── tests/
│   │   ├── listingService.test.js   # 31 unit tests
│   │   ├── authService.test.js      # 53 unit tests
│   │   └── favoriteService.test.js  # 12 unit tests
│   ├── server.js                    # Entry point
│   ├── seed.js                      # Test data seeder
│   └── package.json
└── frontend/
    ├── index.html                   # Landing page
    ├── login.html                   # Login form
    ├── register.html                # Registration + email verification flow
    ├── forgot-password.html         # Forgot password (email input)
    ├── reset-password.html          # Password reset (OTP code entry + new password)
    ├── app.html                     # Main dashboard shell
    ├── assets/
    │   ├── campusboard_app_icon.svg  # App icon (SVG)
    │   ├── icon-192.png              # PWA / favicon (192×192)
    │   ├── icon-512.png              # PWA icon (512×512)
    │   └── istanbul_arel_university_logo_black.svg
    ├── sitemap.xml                  # Sitemap (submitted to Google Search Console)
    ├── css/
    │   ├── style.css                # Main styles
    │   └── auth.css                 # Auth page styles
    ├── js/
    │   ├── nav.js                   # Cross-page transition helper (View Transitions API + fallback)
    │   ├── api.js                   # Fetch wrapper (Authorization header)
    │   ├── ui.js                    # DOM rendering, card & modal logic
    │   └── main.js                  # App controller & event listeners
    └── vercel.json                  # Vercel routing + API proxy to Railway
```

---

## API Reference

### Authentication — `/api/auth` (rate-limit: 20 requests / 15 min)

| Method | URL | Description | Protected |
|--------|-----|-------------|-----------|
| GET | `/api/auth/universities` | List supported universities and domains | — |
| POST | `/api/auth/register` | Register with university email (sends verification code) | — |
| POST | `/api/auth/verify-email` | Verify email with 6-digit OTP code | — |
| POST | `/api/auth/resend-verify` | Resend email verification code | — |
| POST | `/api/auth/login` | Login — returns JWT token | — |
| POST | `/api/auth/forgot-password` | Send password reset OTP to email | — |
| POST | `/api/auth/verify-reset-code` | Validate password reset OTP (without changing password) | — |
| POST | `/api/auth/reset-password` | Reset password using OTP code | — |
| GET | `/api/auth/me` | Current user summary from token | ✓ |
| GET | `/api/auth/profile` | Full profile details | ✓ |
| PUT | `/api/auth/profile` | Update profile (including avatar) | ✓ |

### Listings — `/api/listings`

| Method | URL | Description | Protected |
|--------|-----|-------------|-----------|
| GET | `/api/listings` | List listings (filtered, paginated) | ✓ |
| GET | `/api/listings/summary` | Summary counts for current filters | ✓ |
| GET | `/api/listings/:id` | Get single listing (+view counter) | ✓ |
| POST | `/api/listings` | Create new listing | ✓ |
| PUT | `/api/listings/:id` | Update listing (owner only) | ✓ |
| PATCH | `/api/listings/:id/status` | Change status: active/closed (owner only) | ✓ |
| DELETE | `/api/listings/:id` | Delete listing (owner only) | ✓ |

**Query parameters — `GET /api/listings`:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `faculty` | string | Filter by faculty |
| `status` | string | `active` / `closed` |
| `search` | string | Full-text search in title and description |
| `mine` | boolean | `true` → show only my listings |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 12, max: 50) |

**Pagination response format:**
```json
{
  "data": [...],
  "total": 23,
  "page": 1,
  "limit": 12,
  "totalPages": 2
}
```

### Favorites — `/api/favorites`

| Method | URL | Description | Protected |
|--------|-----|-------------|-----------|
| GET | `/api/favorites` | List my favorite listings | ✓ |
| POST | `/api/favorites/:listingId` | Toggle favorite (add/remove) | ✓ |

### Stats — `/api/stats`

| Method | URL | Description | Protected |
|--------|-----|-------------|-----------|
| GET | `/api/stats` | Platform-wide statistics | ✓ |

### Meta

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/categories` | List of valid categories |
| GET | `/api/faculties` | List of valid faculties |

---

## Example Requests

### Register & Login

```bash
# Register (sends verification email)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Ali Kaya", "email": "ali@uni.edu.tr", "password": "MyPass123!"}'

# Verify email
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email": "ali@uni.edu.tr", "code": "123456"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ali@uni.edu.tr", "password": "MyPass123!"}'
```

### Forgot / Reset Password

```bash
# Request reset OTP
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "ali@uni.edu.tr"}'

# Reset password (OTP expires in 10 minutes; new password must differ from last 3)
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email": "ali@uni.edu.tr", "code": "654321", "password": "NewPass456!"}'
```

### Listing Operations

```bash
# Create a listing
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Calculus II Course Notes",
    "description": "Second semester integral notes, homework solutions included",
    "category": "ders-notu",
    "faculty": "muhendislik",
    "contact": "ali@uni.edu.tr||0532 111 22 33"
  }'

# Faculty + category filtered search, page 2
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/listings?faculty=muhendislik&category=staj&page=2"

# My listings only
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/listings?mine=true"
```

### Contact Format

Multiple contact entries are separated by `||`:

```
"ali@uni.edu.tr||0532 111 22 33||@ali_student"
```

Email, phone, and other types (social media, etc.) are auto-detected.

---

## Features

### Authentication & Security
- University email verification required on registration (OTP via email)
- JWT-based sessions; token valid for 7 days
- Forgot password / reset password with time-limited OTP codes
- Password history: last 3 passwords cannot be reused
- Password hashing with bcrypt
- Rate limiting on auth endpoints (20 requests per 15 min)
- JWT required for all CRUD operations

### Email
- Transactional email via Resend API
- Verification code email on registration
- Password reset OTP email
- Unified dark-themed branded templates

### Listing Management
- Full CRUD support
- 6 category filters, 9 faculty filters
- Full-text search on title and description
- Expiry date (`expires_at`) and auto-close
- Closed listings auto-deleted after 30 days
- Pagination (default 12 listings/page)

### Favorites
- Toggle any listing as favorite (add/remove)
- View favorites list
- Favorites auto-removed when a listing is deleted

### Mobile UX
- Dashboard header adapts to viewport: full labels on desktop (`Favorilerim`, `İlanlarım`, `Yeni İlan`), compact labels on mobile (`Favori`, `İlanlar`, `Yeni`)
- Modals (İlanlarım / Favorilerim / İlan Detayı) centered on mobile — no bottom-anchoring
- Yeni İlan form: compact layout, buttons stay inside the card, no viewport-bottom overlap
- Expiry date input uses a masked `gg/aa/yyyy` text field (no native date picker)
- Tap highlight removed on mobile for cleaner interactions
- Custom thin scroll indicator on mobile; hidden on desktop
- Category bar shows a horizontal-scroll affordance on narrow screens

### View Counter
- Unique views per user (same user viewing multiple times counts as 1)
- Tracked via `listing_views(user_id, listing_id)` table

### Profile Management
- Name, faculty, department, student ID, phone
- Base64 profile photo upload (max 2 MB)

### Statistics
- Platform-wide: total/active/closed listings, views, user count
- Distribution by category and faculty

---

## Architecture Decisions

- **Business logic separated from routes:** Services are directly testable; routes handle only the HTTP layer.
- **Dependency injection:** `Service(db)` → `Controller(service)` — in-memory SQLite used in tests, PostgreSQL in production.
- **Dual-adapter database layer:** `db.js` exports a unified interface over both `pg` (PostgreSQL) and `better-sqlite3`, selected by `DATABASE_URL`.
- **Dual-side validation:** Both frontend and backend enforce the same rules.
- **Data isolation:** Write operations enforced at API level with `WHERE id = ? AND user_id = ?`; users cannot access other users' records.
- **Multi-page + smooth transitions:** Each page is a separate HTML document. Cross-page navigation uses the View Transitions API (`@view-transition { navigation: auto }`) in Chrome/Edge for slide-fade animations, with a JS opacity-fade fallback (`nav.js`) for Firefox/Safari.
- **Information non-disclosure:** Write operations targeting another user's record return `404` — existence is never revealed.
- **Vercel + Railway split:** Frontend is a static site on Vercel; `vercel.json` proxies `/api/*` to the Railway backend, so the frontend has no hardcoded backend URL.
- **PWA-ready icons:** `icon-192.png` and `icon-512.png` serve as favicon, Apple touch icon, and future PWA manifest icons. `/favicon.ico` is rewritten to `icon-192.png` via Vercel rewrites.
- **SEO:** `sitemap.xml` lists all public routes and is submitted to Google Search Console for faster indexing.
