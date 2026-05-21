# CampusBoard • Student Bulletin Board

A JWT-protected full-stack student bulletin board. Students can share course notes, events, internships, second-hand items, lost & found posts, and general announcements.

**Live:** https://campusboard.app  
**Swagger:** http://localhost:3000/api-docs *(development only)*

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript (SPA), HTML5, CSS3 |
| Backend | Node.js + Express |
| Database | PostgreSQL (production/local) · SQLite in-memory (tests only) |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| API Documentation | Swagger UI (OpenAPI 3.0) |
| Testing | Jest |
| Security | express-rate-limit |
| Deployment | Vercel (frontend) · Railway (backend) |

---

## Setup

### Requirements

- Node.js v18+
- npm
- PostgreSQL (for local development)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/huseyinky40/campusboard.git
cd campusboard

# 2. Install backend dependencies
cd campusboard/backend
npm install

# 3. Start the server
DATABASE_URL=postgresql://<user>@localhost/<dbname> npm start
```

App: `http://localhost:3000`  
Swagger UI: `http://localhost:3000/api-docs`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Token signing secret | Required in production |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | No |

### Development Mode (auto-reload)

```bash
npm run dev
```

### Run Tests

```bash
cd campusboard/backend
npm test
```

58 tests · 3 files · ListingService · AuthService · FavoriteService

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
│   │   │   ├── authService.js       # Register, login, profile business logic
│   │   │   ├── favoriteService.js   # Favorite toggle and listing
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
│   │   ├── listingService.test.js   # 28 unit tests
│   │   ├── authService.test.js      # 18 unit tests
│   │   └── favoriteService.test.js  # 12 unit tests
│   ├── server.js                    # Entry point
│   └── package.json
└── frontend/
    ├── index.html                   # Landing page
    ├── login.html                   # Login form
    ├── register.html                # Registration form
    ├── app.html                     # Main SPA shell (dashboard)
    ├── assets/                      # Logo and images
    ├── css/
    │   ├── style.css                # Main styles
    │   └── auth.css                 # Login/register styles
    └── js/
        ├── api.js                   # Fetch wrapper (Authorization header)
        ├── ui.js                    # DOM rendering, card & modal logic
        └── main.js                  # App controller & event listeners
```

---

## API Reference

### Authentication — `/api/auth` (rate-limit: 20 requests / 15 min)

| Method | URL | Description | Protected |
|--------|-----|-------------|-----------|
| POST | `/api/auth/register` | Register a new user | — |
| POST | `/api/auth/login` | Login — returns JWT token | — |
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
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Ali Kaya", "email": "ali@uni.edu", "password": "password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ali@uni.edu", "password": "password123"}'
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
    "contact": "ali@uni.edu||0532 111 22 33"
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
"ali@uni.edu||0532 111 22 33||@ali_student"
```

Email, phone, and other types (social media, etc.) are auto-detected.

---

## Features

### Authentication & Security
- JWT-based register/login; token valid for 7 days
- Password hashing with bcrypt
- Rate limiting on auth endpoints (20 requests per 15 min)
- JWT required for all CRUD operations

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
- **Dual-side validation:** Both frontend and backend enforce the same rules.
- **Data isolation:** Write operations enforced at API level with `WHERE id = ? AND user_id = ?`; users cannot access other users' records.
- **SPA:** All navigation done via fetch — no page reloads.
- **Information non-disclosure:** Write operations targeting another user's record return `404` — existence is never revealed.
