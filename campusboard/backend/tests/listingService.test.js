const { ListingService, VALID_CATEGORIES, VALID_FACULTIES } = require('../src/services/listingService');
const { createDb } = require('../src/db');

function makeDb() { return createDb(':memory:'); }

// Seed a user so listings have a valid user_id FK
function seedUser(db) {
  const result = db.prepare("INSERT INTO users (email, password, name) VALUES ('test@test.com','hash','Test')").run();
  return result.lastInsertRowid;
}

const validData = {
  title: 'Test İlanı Başlığı',
  description: 'Bu bir test açıklamasıdır, yeterince uzun.',
  category: 'ders-notu',
  faculty: 'muhendislik',
  contact: 'test@uni.edu',
};

describe('ListingService — validate', () => {
  let service;
  beforeEach(() => { service = new ListingService(makeDb()); });

  test('geçerli veriyle hata dönmemeli', () => {
    expect(service.validate(validData)).toHaveLength(0);
  });
  test('eksik başlıkta hata vermeli', () => {
    expect(service.validate({ ...validData, title: 'ab' })).toContain('Başlık en az 3 karakter olmalıdır');
  });
  test('uzun başlıkta hata vermeli', () => {
    expect(service.validate({ ...validData, title: 'a'.repeat(101) })).toContain('Başlık en fazla 100 karakter olabilir');
  });
  test('kısa açıklamada hata vermeli', () => {
    expect(service.validate({ ...validData, description: 'kısa' })).toContain('Açıklama en az 10 karakter olmalıdır');
  });
  test('geçersiz kategoride hata vermeli', () => {
    expect(service.validate({ ...validData, category: 'yok-boyle' })).toContain('Geçersiz kategori');
  });
  test('geçersiz fakültede hata vermeli', () => {
    expect(service.validate({ ...validData, faculty: 'uzay-okulu' })).toContain('Geçersiz fakülte');
  });
  test('eksik iletişim bilgisinde hata vermeli', () => {
    expect(service.validate({ ...validData, contact: 'ab' })).toContain('İletişim bilgisi gereklidir');
  });
});

describe('ListingService — CRUD', () => {
  let service, db, userId;
  beforeEach(() => {
    db = makeDb();
    userId = seedUser(db);
    service = new ListingService(db);
  });

  test('ilan oluşturulabilmeli', () => {
    const l = service.create(userId, validData);
    expect(l.id).toBeDefined();
    expect(l.title).toBe(validData.title);
    expect(l.status).toBe('aktif');
    expect(l.user_id).toBe(userId);
  });
  test('geçersiz veriyle oluşturma hata atmalı', () => {
    expect(() => service.create(userId, { ...validData, title: 'ab' })).toThrow();
  });
  test('oluşturulan ilan getirilebilmeli', () => {
    const created = service.create(userId, validData);
    expect(service.getById(userId, created.id).title).toBe(validData.title);
  });
  test('olmayan id için getById null dönmeli', () => {
    expect(service.getById(userId, 9999)).toBeNull();
  });
  test('herhangi bir kullanıcı başkasının ilanını görüntüleyebilmeli', () => {
    const created = service.create(userId, validData);
    const otherId = db.prepare("INSERT INTO users (email,password,name) VALUES ('other@test.com','hash','Other')").run().lastInsertRowid;
    // İlan panosu: tüm authenticated kullanıcılar tüm ilanları görebilir
    expect(service.getById(otherId, created.id)).not.toBeNull();
    expect(service.getById(otherId, created.id).id).toBe(created.id);
  });
  test('ilan güncellenebilmeli', () => {
    const created = service.create(userId, validData);
    const updated = service.update(userId, created.id, { ...validData, title: 'Güncellenmiş Başlık' });
    expect(updated.title).toBe('Güncellenmiş Başlık');
  });
  test('olmayan ilan güncellemesi null dönmeli', () => {
    expect(service.update(userId, 9999, validData)).toBeNull();
  });
  test('ilan durumu güncellenebilmeli', () => {
    const created = service.create(userId, validData);
    expect(service.updateStatus(userId, created.id, 'kapandi').status).toBe('kapandi');
  });
  test('geçersiz durum hata atmalı', () => {
    const created = service.create(userId, validData);
    expect(() => service.updateStatus(userId, created.id, 'gecersiz')).toThrow();
  });
  test('ilan silinebilmeli', () => {
    const created = service.create(userId, validData);
    expect(service.delete(userId, created.id)).toBe(true);
    expect(service.getById(userId, created.id)).toBeNull();
  });
  test('olmayan ilanı silmek false dönmeli', () => {
    expect(service.delete(userId, 9999)).toBe(false);
  });
});

describe('ListingService — getAll filtreleme', () => {
  let service, userId;
  beforeEach(() => {
    const db = makeDb();
    userId = seedUser(db);
    service = new ListingService(db);
    service.create(userId, { ...validData, category: 'ders-notu', faculty: 'muhendislik' });
    service.create(userId, { ...validData, category: 'etkinlik', faculty: 'tip', title: 'Etkinlik İlanı Başlığı' });
    service.create(userId, { ...validData, category: 'staj',     faculty: 'muhendislik', title: 'Staj İlanı Başlık' });
  });

  test('filtresiz tüm ilanları getirmeli', () => {
    expect(service.getAll(userId).data).toHaveLength(3);
  });
  test('kategoriye göre filtrelemeli', () => {
    const r = service.getAll(userId, { category: 'ders-notu' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].category).toBe('ders-notu');
  });
  test('fakülteye göre filtrelemeli', () => {
    expect(service.getAll(userId, { faculty: 'tip' }).data).toHaveLength(1);
  });
  test('arama yapabilmeli', () => {
    const r = service.getAll(userId, { search: 'Etkinlik' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].category).toBe('etkinlik');
  });
  test('birden fazla filtre birlikte çalışmalı', () => {
    expect(service.getAll(userId, { faculty: 'muhendislik', category: 'staj' }).data).toHaveLength(1);
  });
  test('tüm ilanlar her kullanıcıya görünmeli (bulletin board)', () => {
    expect(service.getAll(userId + 1).data).toHaveLength(3);
  });
  test('mine:true yalnızca kendi ilanlarını getirmeli', () => {
    expect(service.getAll(userId, { mine: true }).data).toHaveLength(3);
    expect(service.getAll(userId + 1, { mine: true }).data).toHaveLength(0);
  });
  test('pagination metadata dönmeli', () => {
    const r = service.getAll(userId, { page: 1, limit: 2 });
    expect(r.data).toHaveLength(2);
    expect(r.total).toBe(3);
    expect(r.totalPages).toBe(2);
    expect(r.page).toBe(1);
  });
});

describe('ListingService — meta', () => {
  let service;
  beforeEach(() => { service = new ListingService(makeDb()); });

  test('kategorileri dönmeli', () => {
    expect(service.getCategories()).toEqual(VALID_CATEGORIES);
  });
  test('fakülteleri dönmeli', () => {
    expect(service.getFaculties()).toEqual(VALID_FACULTIES);
  });
});
