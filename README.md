# CampusBoard — Student Bulletin Board

A JWT-protected full-stack web application for university students to manage course notes, events, internship listings, second-hand items, and lost & found posts.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JavaScript (SPA), HTML5, CSS3 |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| API Docs | Swagger UI (OpenAPI 3.0) |
| Testing | Jest |
| Security | express-rate-limit |

## Setup

### Requirements
- Node.js v18+
- npm

### Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd campusboard

# 2. Install dependencies
cd backend
npm install

# 3. Start the server
npm start
```

App runs at `http://localhost:3000`  
Swagger UI: `http://localhost:3000/api-docs`

Development mode (auto-reload):
```bash
npm run dev
```

### Run Tests

```bash
cd backend
npm test
```

3 test files, 57 tests (ListingService · AuthService · FavoriteService).

## JWT & Data Isolation

All protected endpoints require an `Authorization: Bearer <token>` header.

**Write operations are strictly user-scoped:**
- A user can only edit, delete, or change the status of their own listings.
- Write requests targeting another user's listing return `404` — as if it doesn't exist (no information leakage).
- Favorites are private and not visible to other users.

**Public read access:**
- The board is an open bulletin board for authenticated users. All active listings are visible to any logged-in user — this is the core purpose of the app.
- Contact information on a listing detail view is shown only to users other than the listing owner.

## Project Structure

```
campusboard/
├── backend/
│   ├── src/
│   │   ├── db.js                        # SQLite connection, schema & runtime migration
│   │   ├── middleware/
│   │   │   └── auth.js                  # JWT verification middleware
│   │   ├── services/
│   │   │   ├── listingService.js        # Listing business logic & pagination
│   │   │   ├── authService.js           # Register, login, profile business logic
│   │   │   ├── favoriteService.js       # Favorite toggle & listing
│   │   │   └── statsService.js          # Platform statistics
│   │   ├── controllers/
│   │   │   ├── listingController.js     # Listing HTTP layer
│   │   │   ├── authController.js        # Auth HTTP layer
│   │   │   └── favoriteController.js    # Favorite HTTP layer
│   │   ├── routes/
│   │   │   ├── listings.js              # Listing routes (JWT protected)
│   │   │   ├── auth.js                  # Auth routes (rate-limited)
│   │   │   ├── favorites.js             # Favorite routes (JWT protected)
│   │   │   └── stats.js                 # Stats routes (JWT protected)
│   │   └── app.js                       # Express app setup
│   ├── tests/
│   │   ├── listingService.test.js       # 28 unit tests
│   │   ├── authService.test.js          # 17 unit tests
│   │   └── favoriteService.test.js      # 12 unit tests
│   ├── server.js                        # Entry point
│   └── package.json
└── frontend/
    ├── index.html                       # Main SPA (dashboard)
    ├── login.html                       # Login page
    ├── register.html                    # Register page
    ├── assets/
    ├── css/
    │   ├── style.css                    # Main styles
    │   └── auth.css                     # Login/register styles
    └── js/
        ├── api.js                       # Fetch wrapper (with auth header)
        ├── ui.js                        # DOM rendering, card & modal logic
        └── main.js                      # App controller & event listeners
```

## API Reference

### Auth — `/api/auth` (rate-limited: 20 requests / 15 min)

| Method | URL | Description | Protected |
|--------|-----|-------------|-----------|
| POST | `/api/auth/register` | Register a new user | — |
| POST | `/api/auth/login` | Login — returns JWT token | — |
| GET | `/api/auth/profile` | Get profile info | ✓ |
| PUT | `/api/auth/profile` | Update profile (incl. avatar) | ✓ |

### Listings — `/api/listings`

| Method | URL | Description | Protected |
|--------|-----|-------------|-----------|
| GET | `/api/listings` | List listings | ✓ |
| GET | `/api/listings/:id` | Get single listing (+view counter) | ✓ |
| POST | `/api/listings` | Create new listing | ✓ |
| PUT | `/api/listings/:id` | Update listing (owner only) | ✓ |
| PATCH | `/api/listings/:id/status` | Change status (owner only) | ✓ |
| DELETE | `/api/listings/:id` | Delete listing (owner only) | ✓ |

**Query parameters (GET /api/listings):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `faculty` | string | Filter by faculty |
| `status` | string | `active` / `closed` |
| `search` | string | Search in title and description |
| `mine` | boolean | Show only my listings |
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

**Example response:**
```json
{
  "total_listings": 23,
  "active_listings": 20,
  "closed_listings": 3,
  "total_views": 147,
  "total_users": 5,
  "total_favorites": 12,
  "by_category": { "course-notes": 5, "general": 5, "second-hand": 4 },
  "by_faculty": { "engineering": 8, "other": 5 }
}
```

### Meta Endpoints (JWT protected)

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/categories` | List of valid categories |
| GET | `/api/faculties` | List of valid faculties |

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
    "category": "course-notes",
    "faculty": "engineering",
    "contact": "ali@uni.edu||0532 111 22 33"
  }'

# Filtered search — engineering internship listings, page 2
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/listings?faculty=engineering&category=internship&page=2"
```

### Contact Format

Multiple contact entries are separated by `||`:

```
"ali@uni.edu||0532 111 22 33||@ali_student"
```

Email, phone, and other types (social media, etc.) are auto-detected.

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
- Expiry date & auto-close (expires_at)
- Closed listings auto-deleted after 30 days
- Pagination (default 12 listings/page)

### Favorites
- Toggle any listing as favorite (add/remove)
- Fetch favorites list
- Favorites auto-removed when a listing is deleted

### View Counter
- Unique views per user (same user clicking multiple times counts as 1)
- Tracked via `listing_views(user_id, listing_id)` table

### Profile Management
- Name, faculty, department, student ID, phone
- Base64 profile photo upload (max 2 MB)

### Statistics
- Platform-wide: total listings, active/closed breakdown, total views, user count
- Distribution by category and faculty

## Architecture Decisions

- **Business logic separated from routes:** Services are directly testable; routes handle only the HTTP layer.
- **Dependency injection:** `Service(db)` → `Controller(service)` — in-memory SQLite used in tests.
- **Runtime migration:** Missing columns detected via `PRAGMA table_info` and added with `ALTER TABLE`.
- **Dual-side validation:** Both frontend and backend enforce the same rules.
- **Data isolation:** Write operations enforced at API level with `WHERE id = ? AND user_id = ?`; users cannot access other users' records.
- **SPA:** All navigation done via fetch — no page reloads.
