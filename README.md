# CampusBoard • Kampüs İlan Panosu

JWT korumalı, full-stack öğrenci ilan panosu. Ders notu, etkinlik, staj, ikinci el, kayıp/bulundu ve genel ilanlar paylaşılabilir.

**Canlı:** https://campusboard.app  
**Swagger:** http://localhost:3000/api-docs *(yalnızca geliştirme ortamında)*

---

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Vanilla JavaScript (SPA), HTML5, CSS3 |
| Backend | Node.js + Express |
| Veritabanı | PostgreSQL (production/lokal) · SQLite in-memory (testler) |
| Kimlik Doğrulama | JWT (jsonwebtoken) + bcryptjs |
| API Dokümantasyon | Swagger UI (OpenAPI 3.0) |
| Test | Jest |
| Güvenlik | express-rate-limit |
| Deployment | Vercel (frontend) · Railway (backend) |

---

## Kurulum

### Gereksinimler

- Node.js v18+
- npm
- PostgreSQL (lokal geliştirme için)

### Adımlar

```bash
# 1. Repoyu klonla
git clone https://github.com/huseyinky40/campusboard.git
cd campusboard

# 2. Backend bağımlılıklarını yükle
cd campusboard/backend
npm install

# 3. Sunucuyu başlat
DATABASE_URL=postgresql://<kullanici>@localhost/<db_adi> npm start
```

Uygulama: `http://localhost:3000`  
Swagger UI: `http://localhost:3000/api-docs`

### Ortam Değişkenleri

| Değişken | Açıklama | Zorunlu |
|----------|----------|---------|
| `DATABASE_URL` | PostgreSQL bağlantı string'i | Evet |
| `JWT_SECRET` | Token imzalama anahtarı | Production'da zorunlu |
| `CORS_ORIGINS` | İzin verilen origin'ler (virgülle ayrılmış) | Hayır |

### Geliştirme Modu (otomatik yeniden başlatma)

```bash
npm run dev
```

### Testleri Çalıştır

```bash
cd campusboard/backend
npm test
```

58 test · 3 dosya · ListingService · AuthService · FavoriteService

---

## Proje Yapısı

```
campusboard/
├── backend/
│   ├── src/
│   │   ├── db.js                    # PostgreSQL/SQLite adaptör, şema oluşturma
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT doğrulama middleware
│   │   ├── services/
│   │   │   ├── listingService.js    # İlan iş mantığı, filtreleme, sayfalama
│   │   │   ├── authService.js       # Kayıt, giriş, profil iş mantığı
│   │   │   ├── favoriteService.js   # Favori toggle ve listeleme
│   │   │   └── statsService.js      # Platform istatistikleri
│   │   ├── controllers/
│   │   │   ├── listingController.js # İlan HTTP katmanı
│   │   │   ├── authController.js    # Kimlik doğrulama HTTP katmanı
│   │   │   └── favoriteController.js# Favori HTTP katmanı
│   │   ├── routes/
│   │   │   ├── listings.js          # İlan rotaları (JWT korumalı)
│   │   │   ├── auth.js              # Kimlik rotaları (rate-limited)
│   │   │   ├── favorites.js         # Favori rotaları (JWT korumalı)
│   │   │   └── stats.js             # İstatistik rotaları (JWT korumalı)
│   │   └── app.js                   # Express uygulama kurulumu
│   ├── tests/
│   │   ├── listingService.test.js   # 28 birim test
│   │   ├── authService.test.js      # 18 birim test
│   │   └── favoriteService.test.js  # 12 birim test
│   ├── server.js                    # Giriş noktası
│   └── package.json
└── frontend/
    ├── index.html                   # Giriş sayfası (landing)
    ├── login.html                   # Giriş formu
    ├── register.html                # Kayıt formu
    ├── app.html                     # Ana SPA shell (dashboard)
    ├── assets/                      # Logo ve görseller
    ├── css/
    │   ├── style.css                # Ana stiller
    │   └── auth.css                 # Giriş/kayıt stilleri
    └── js/
        ├── api.js                   # Fetch sarmalayıcı (Authorization header)
        ├── ui.js                    # DOM render, kart & modal mantığı
        └── main.js                  # Uygulama kontrolcüsü & event listener'lar
```

---

## API Referansı

### Kimlik Doğrulama — `/api/auth` (rate-limit: 20 istek / 15 dk)

| Metot | URL | Açıklama | Korumalı |
|-------|-----|----------|----------|
| POST | `/api/auth/register` | Yeni kullanıcı kaydı | — |
| POST | `/api/auth/login` | Giriş — JWT token döner | — |
| GET | `/api/auth/me` | Token'daki kullanıcı özeti | ✓ |
| GET | `/api/auth/profile` | Detaylı profil bilgisi | ✓ |
| PUT | `/api/auth/profile` | Profil güncelle (avatar dahil) | ✓ |

### İlanlar — `/api/listings`

| Metot | URL | Açıklama | Korumalı |
|-------|-----|----------|----------|
| GET | `/api/listings` | İlanları listele (filtreli, sayfalı) | ✓ |
| GET | `/api/listings/summary` | Filtre özet sayıları | ✓ |
| GET | `/api/listings/:id` | Tek ilan getir (+görüntülenme sayacı) | ✓ |
| POST | `/api/listings` | Yeni ilan oluştur | ✓ |
| PUT | `/api/listings/:id` | İlanı güncelle (yalnızca sahibi) | ✓ |
| PATCH | `/api/listings/:id/status` | Durum değiştir: aktif/kapandi (yalnızca sahibi) | ✓ |
| DELETE | `/api/listings/:id` | İlanı sil (yalnızca sahibi) | ✓ |

**Query parametreleri — `GET /api/listings`:**

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `category` | string | Kategori filtresi |
| `faculty` | string | Fakülte filtresi |
| `status` | string | `aktif` / `kapandi` |
| `search` | string | Başlık ve açıklamada arama |
| `mine` | boolean | `true` → yalnızca kendi ilanlarım |
| `page` | integer | Sayfa numarası (varsayılan: 1) |
| `limit` | integer | Sayfa başına ilan (varsayılan: 12, maks: 50) |

**Sayfalama yanıt formatı:**
```json
{
  "data": [...],
  "total": 23,
  "page": 1,
  "limit": 12,
  "totalPages": 2
}
```

### Favoriler — `/api/favorites`

| Metot | URL | Açıklama | Korumalı |
|-------|-----|----------|----------|
| GET | `/api/favorites` | Favori ilanlarımı listele | ✓ |
| POST | `/api/favorites/:listingId` | Favoriye ekle / çıkar (toggle) | ✓ |

### İstatistikler — `/api/stats`

| Metot | URL | Açıklama | Korumalı |
|-------|-----|----------|----------|
| GET | `/api/stats` | Platform geneli istatistikler | ✓ |

### Meta

| Metot | URL | Açıklama |
|-------|-----|----------|
| GET | `/api/categories` | Geçerli kategori listesi |
| GET | `/api/faculties` | Geçerli fakülte listesi |

---

## Örnek İstekler

### Kayıt ve Giriş

```bash
# Kayıt
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Ali Kaya", "email": "ali@uni.edu", "password": "sifre1234"}'

# Giriş
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ali@uni.edu", "password": "sifre1234"}'
```

### İlan İşlemleri

```bash
# İlan oluştur
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Calculus II Ders Notu",
    "description": "İkinci dönem integral notları, ödev çözümleri dahil",
    "category": "ders-notu",
    "faculty": "muhendislik",
    "contact": "ali@uni.edu||0532 111 22 33"
  }'

# Fakülte + kategori filtreli arama, 2. sayfa
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/listings?faculty=muhendislik&category=staj&page=2"

# Sadece kendi ilanlarım
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/listings?mine=true"
```

### İletişim Formatı

Birden fazla iletişim bilgisi `||` ile ayrılır:

```
"ali@uni.edu||0532 111 22 33||@ali_student"
```

E-posta, telefon ve diğer türler (sosyal medya vb.) otomatik algılanır.

---

## Özellikler

### Kimlik Doğrulama & Güvenlik
- JWT tabanlı kayıt/giriş; token 7 gün geçerli
- bcrypt ile şifre hashleme
- Auth endpoint'lerinde rate limiting (15 dk'da 20 istek)
- Tüm CRUD işlemleri için JWT zorunlu

### İlan Yönetimi
- Tam CRUD desteği
- 6 kategori, 9 fakülte filtresi
- Başlık ve açıklamada tam metin arama
- Bitiş tarihi (`expires_at`) ve otomatik kapanma
- Kapanan ilanlar 30 gün sonra otomatik silme
- Sayfalama (varsayılan 12 ilan/sayfa)

### Favoriler
- Herhangi bir ilanı favoriye ekle/çıkar (toggle)
- Favori listesi görüntüleme
- İlan silindiğinde favoriler otomatik kaldırılır

### Görüntülenme Sayacı
- Kullanıcı başına tekil görüntülenme (aynı kullanıcı birden fazla baksa 1 sayılır)
- `listing_views(user_id, listing_id)` tablosu ile takip

### Profil Yönetimi
- Ad, fakülte, bölüm, öğrenci numarası, telefon
- Base64 profil fotoğrafı yükleme (maks 2 MB)

### İstatistikler
- Platform geneli: toplam/aktif/kapandı ilan sayısı, görüntülenme, kullanıcı sayısı
- Kategori ve fakülte bazında dağılım

---

## Mimari Kararlar

- **İş mantığı route'lardan ayrı:** Service'ler doğrudan test edilebilir; route'lar yalnızca HTTP katmanını yönetir.
- **Dependency injection:** `Service(db)` → `Controller(service)` — testlerde in-memory SQLite kullanılır, production'da PostgreSQL.
- **Çift taraflı validasyon:** Hem frontend hem backend aynı kuralları uygular.
- **Veri izolasyonu:** Yazma işlemleri API seviyesinde `WHERE id = ? AND user_id = ?` ile zorunlu tutulur; kullanıcılar başkasının kaydına erişemez.
- **SPA:** Tüm navigasyon fetch ile yapılır — sayfa yenilenmez.
- **Bilgi sızdırmazlık:** Başkasına ait kayıt üzerindeki yazma işlemleri `404` döner; kaydın var olup olmadığı belli edilmez.
