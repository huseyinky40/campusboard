const { FavoriteService } = require('../src/services/favoriteService');
const { ListingService }  = require('../src/services/listingService');
const { createDb }        = require('../src/db');

async function makeDb() { return createDb(':memory:'); }

async function seedUser(db, email = 'test@test.com', name = 'Test') {
  const result = await db.run(
    "INSERT INTO users (email, password, name) VALUES (?, 'hash', ?) RETURNING id",
    [email, name]
  );
  return result.rows[0].id;
}

const validListing = {
  title: 'Test İlanı Başlığı',
  description: 'Bu bir test açıklamasıdır, yeterince uzun.',
  category: 'ders-notu',
  faculty: 'muhendislik',
  contact: 'test@uni.edu',
};

describe('FavoriteService — toggle', () => {
  let db, favService, listingService, userId, listingId;

  beforeEach(async () => {
    db = await makeDb();
    userId = await seedUser(db);
    listingService = new ListingService(db);
    favService = new FavoriteService(db);
    const listing = await listingService.create(userId, validListing);
    listingId = listing.id;
  });

  test('olmayan ilana toggle null dönmeli', async () => {
    expect(await favService.toggle(userId, 9999)).toBeNull();
  });

  test('ilk toggle favoriye eklemeli', async () => {
    const result = await favService.toggle(userId, listingId);
    expect(result).toEqual({ favorited: true });
  });

  test('ikinci toggle favoriden çıkarmalı', async () => {
    await favService.toggle(userId, listingId);
    const result = await favService.toggle(userId, listingId);
    expect(result).toEqual({ favorited: false });
  });

  test('üçüncü toggle tekrar eklemeli', async () => {
    await favService.toggle(userId, listingId);
    await favService.toggle(userId, listingId);
    const result = await favService.toggle(userId, listingId);
    expect(result).toEqual({ favorited: true });
  });

  test('farklı kullanıcılar aynı ilanı bağımsız olarak favorileyebilmeli', async () => {
    const userId2 = await seedUser(db, 'other@test.com', 'Other');
    const r1 = await favService.toggle(userId, listingId);
    const r2 = await favService.toggle(userId2, listingId);
    expect(r1).toEqual({ favorited: true });
    expect(r2).toEqual({ favorited: true });
  });
});

describe('FavoriteService — getAll', () => {
  let db, favService, listingService, userId;

  beforeEach(async () => {
    db = await makeDb();
    userId = await seedUser(db);
    listingService = new ListingService(db);
    favService = new FavoriteService(db);
  });

  test('favori yokken boş dizi dönmeli', async () => {
    expect(await favService.getAll(userId)).toHaveLength(0);
  });

  test('favoriye eklenen ilanlar listelenmeli', async () => {
    const l1 = await listingService.create(userId, validListing);
    const l2 = await listingService.create(userId, { ...validListing, title: 'İkinci İlan Başlığı' });
    await favService.toggle(userId, l1.id);
    await favService.toggle(userId, l2.id);
    expect(await favService.getAll(userId)).toHaveLength(2);
  });

  test('favoriden çıkarılan ilan listelenmemeli', async () => {
    const l = await listingService.create(userId, validListing);
    await favService.toggle(userId, l.id);
    await favService.toggle(userId, l.id);
    expect(await favService.getAll(userId)).toHaveLength(0);
  });

  test('her kullanıcı yalnızca kendi favorilerini görmeli', async () => {
    const userId2 = await seedUser(db, 'other@test.com', 'Other');
    const l = await listingService.create(userId, validListing);
    await favService.toggle(userId, l.id);
    expect(await favService.getAll(userId)).toHaveLength(1);
    expect(await favService.getAll(userId2)).toHaveLength(0);
  });

  test('ilan silinince favorilerden de kalkmalı', async () => {
    const l = await listingService.create(userId, validListing);
    await favService.toggle(userId, l.id);
    await listingService.delete(userId, l.id);
    expect(await favService.getAll(userId)).toHaveLength(0);
  });

  test('getAll sonucu is_favorited alanı 1 olmalı', async () => {
    const l = await listingService.create(userId, validListing);
    await favService.toggle(userId, l.id);
    const favs = await favService.getAll(userId);
    expect(favs[0].is_favorited).toBe(1);
  });
});
