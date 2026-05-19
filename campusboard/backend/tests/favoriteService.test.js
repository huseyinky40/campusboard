const { FavoriteService } = require('../src/services/favoriteService');
const { ListingService }  = require('../src/services/listingService');
const { createDb }        = require('../src/db');

function makeDb() { return createDb(':memory:'); }

function seedUser(db, email = 'test@test.com', name = 'Test') {
  return db.prepare("INSERT INTO users (email, password, name) VALUES (?, 'hash', ?)").run(email, name).lastInsertRowid;
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

  beforeEach(() => {
    db = makeDb();
    userId = seedUser(db);
    listingService = new ListingService(db);
    favService = new FavoriteService(db);
    const listing = listingService.create(userId, validListing);
    listingId = listing.id;
  });

  test('olmayan ilana toggle null dönmeli', () => {
    expect(favService.toggle(userId, 9999)).toBeNull();
  });

  test('ilk toggle favoriye eklemeli', () => {
    const result = favService.toggle(userId, listingId);
    expect(result).toEqual({ favorited: true });
  });

  test('ikinci toggle favoriden çıkarmalı', () => {
    favService.toggle(userId, listingId);
    const result = favService.toggle(userId, listingId);
    expect(result).toEqual({ favorited: false });
  });

  test('üçüncü toggle tekrar eklemeli', () => {
    favService.toggle(userId, listingId);
    favService.toggle(userId, listingId);
    const result = favService.toggle(userId, listingId);
    expect(result).toEqual({ favorited: true });
  });

  test('farklı kullanıcılar aynı ilanı bağımsız olarak favorileyebilmeli', () => {
    const userId2 = seedUser(db, 'other@test.com', 'Other');
    const r1 = favService.toggle(userId, listingId);
    const r2 = favService.toggle(userId2, listingId);
    expect(r1).toEqual({ favorited: true });
    expect(r2).toEqual({ favorited: true });
  });
});

describe('FavoriteService — getAll', () => {
  let db, favService, listingService, userId;

  beforeEach(() => {
    db = makeDb();
    userId = seedUser(db);
    listingService = new ListingService(db);
    favService = new FavoriteService(db);
  });

  test('favori yokken boş dizi dönmeli', () => {
    expect(favService.getAll(userId)).toHaveLength(0);
  });

  test('favoriye eklenen ilanlar listelenmeli', () => {
    const l1 = listingService.create(userId, validListing);
    const l2 = listingService.create(userId, { ...validListing, title: 'İkinci İlan Başlığı' });
    favService.toggle(userId, l1.id);
    favService.toggle(userId, l2.id);
    expect(favService.getAll(userId)).toHaveLength(2);
  });

  test('favoriden çıkarılan ilan listelenmemeli', () => {
    const l = listingService.create(userId, validListing);
    favService.toggle(userId, l.id);
    favService.toggle(userId, l.id);
    expect(favService.getAll(userId)).toHaveLength(0);
  });

  test('her kullanıcı yalnızca kendi favorilerini görmeli', () => {
    const userId2 = seedUser(db, 'other@test.com', 'Other');
    const l = listingService.create(userId, validListing);
    favService.toggle(userId, l.id);
    expect(favService.getAll(userId)).toHaveLength(1);
    expect(favService.getAll(userId2)).toHaveLength(0);
  });

  test('ilan silinince favorilerden de kalkmalı', () => {
    const l = listingService.create(userId, validListing);
    favService.toggle(userId, l.id);
    listingService.delete(userId, l.id);
    expect(favService.getAll(userId)).toHaveLength(0);
  });

  test('getAll sonucu is_favorited alanı 1 olmalı', () => {
    const l = listingService.create(userId, validListing);
    favService.toggle(userId, l.id);
    const favs = favService.getAll(userId);
    expect(favs[0].is_favorited).toBe(1);
  });
});
