const { ListingService, VALID_CATEGORIES, VALID_FACULTIES } = require('../src/services/listingService');
const { createDb } = require('../src/db');

async function makeDb() { return createDb(':memory:'); }

async function seedUser(db, email = 'test@test.com', name = 'Test') {
  const result = await db.run(
    "INSERT INTO users (email, password, name) VALUES (?, 'hash', ?) RETURNING id",
    [email, name]
  );
  return result.rows[0].id;
}

async function seedExternalUniversityUser(db, email = 'external@test.com', name = 'External') {
  const result = await db.run(
    `INSERT INTO users (email, password, name, university_slug, university_name, university_domain)
     VALUES (?, 'hash', ?, 'external-university', 'External Üniversitesi', 'external.edu.tr') RETURNING id`,
    [email, name]
  );
  return result.rows[0].id;
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
  beforeEach(async () => { service = new ListingService(await makeDb()); });

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
  beforeEach(async () => {
    db = await makeDb();
    userId = await seedUser(db);
    service = new ListingService(db);
  });

  test('ilan oluşturulabilmeli', async () => {
    const l = await service.create(userId, validData);
    expect(l.id).toBeDefined();
    expect(l.title).toBe(validData.title);
    expect(l.status).toBe('aktif');
    expect(l.user_id).toBe(userId);
  });
  test('geçersiz veriyle oluşturma hata atmalı', async () => {
    await expect(service.create(userId, { ...validData, title: 'ab' })).rejects.toBeTruthy();
  });
  test('oluşturulan ilan getirilebilmeli', async () => {
    const created = await service.create(userId, validData);
    expect((await service.getById(userId, created.id)).title).toBe(validData.title);
  });
  test('olmayan id için getById null dönmeli', async () => {
    expect(await service.getById(userId, 9999)).toBeNull();
  });
  test('aynı üniversitedeki kullanıcı başkasının ilanını görüntüleyebilmeli', async () => {
    const created = await service.create(userId, validData);
    const otherId = (await db.run(
      "INSERT INTO users (email, password, name) VALUES ('other@test.com', 'hash', 'Other') RETURNING id",
      []
    )).rows[0].id;
    const listing = await service.getById(otherId, created.id);
    expect(listing).not.toBeNull();
    expect(listing.id).toBe(created.id);
  });
  test('farklı üniversitedeki kullanıcı başka kampüs ilanını görüntüleyememeli', async () => {
    const created = await service.create(userId, validData);
    const externalId = await seedExternalUniversityUser(db);
    expect(await service.getById(externalId, created.id)).toBeNull();
  });
  test('ilan güncellenebilmeli', async () => {
    const created = await service.create(userId, validData);
    const updated = await service.update(userId, created.id, { ...validData, title: 'Güncellenmiş Başlık' });
    expect(updated.title).toBe('Güncellenmiş Başlık');
  });
  test('olmayan ilan güncellemesi null dönmeli', async () => {
    expect(await service.update(userId, 9999, validData)).toBeNull();
  });
  test('ilan durumu güncellenebilmeli', async () => {
    const created = await service.create(userId, validData);
    expect((await service.updateStatus(userId, created.id, 'kapandi')).status).toBe('kapandi');
  });
  test('geçersiz durum hata atmalı', async () => {
    const created = await service.create(userId, validData);
    await expect(service.updateStatus(userId, created.id, 'gecersiz')).rejects.toBeTruthy();
  });
  test('ilan silinebilmeli', async () => {
    const created = await service.create(userId, validData);
    expect(await service.delete(userId, created.id)).toBe(true);
    expect(await service.getById(userId, created.id)).toBeNull();
  });
  test('olmayan ilanı silmek false dönmeli', async () => {
    expect(await service.delete(userId, 9999)).toBe(false);
  });
});

describe('ListingService — getAll filtreleme', () => {
  let service, userId;
  beforeEach(async () => {
    const db = await makeDb();
    userId = await seedUser(db);
    service = new ListingService(db);
    await service.create(userId, { ...validData, category: 'ders-notu', faculty: 'muhendislik' });
    await service.create(userId, { ...validData, category: 'etkinlik', faculty: 'tip', title: 'Etkinlik İlanı Başlığı' });
    await service.create(userId, { ...validData, category: 'staj',     faculty: 'muhendislik', title: 'Staj İlanı Başlık' });
  });

  test('filtresiz tüm ilanları getirmeli', async () => {
    expect((await service.getAll(userId)).data).toHaveLength(3);
  });
  test('kategoriye göre filtrelemeli', async () => {
    const r = await service.getAll(userId, { category: 'ders-notu' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].category).toBe('ders-notu');
  });
  test('fakülteye göre filtrelemeli', async () => {
    expect((await service.getAll(userId, { faculty: 'tip' })).data).toHaveLength(1);
  });
  test('arama yapabilmeli', async () => {
    const r = await service.getAll(userId, { search: 'Etkinlik' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].category).toBe('etkinlik');
  });
  test('birden fazla filtre birlikte çalışmalı', async () => {
    expect((await service.getAll(userId, { faculty: 'muhendislik', category: 'staj' })).data).toHaveLength(1);
  });
  test('tüm ilanlar aynı üniversitedeki her kullanıcıya görünmeli', async () => {
    const db = service.db;
    const otherId = await seedUser(db, 'same-campus@test.com', 'Same Campus');
    expect((await service.getAll(otherId)).data).toHaveLength(3);
  });
  test('farklı üniversite kullanıcısı bu kampüs ilanlarını görmemeli', async () => {
    const db = service.db;
    const externalId = await seedExternalUniversityUser(db);
    expect((await service.getAll(externalId)).data).toHaveLength(0);
  });
  test('mine:true yalnızca kendi ilanlarını getirmeli', async () => {
    const db = service.db;
    const otherId = await seedUser(db, 'same-campus-mine@test.com', 'Same Campus');
    expect((await service.getAll(userId, { mine: true })).data).toHaveLength(3);
    expect((await service.getAll(otherId, { mine: true })).data).toHaveLength(0);
  });
  test('pagination metadata dönmeli', async () => {
    const r = await service.getAll(userId, { page: 1, limit: 2 });
    expect(r.data).toHaveLength(2);
    expect(r.total).toBe(3);
    expect(r.totalPages).toBe(2);
    expect(r.page).toBe(1);
  });
  test('summary tüm filtre sonucuna göre hesaplanmalı, sayfa limitine bağlı kalmamalı', async () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 3);
    const laterDate = new Date();
    laterDate.setDate(laterDate.getDate() + 14);

    await service.create(userId, {
      ...validData,
      title: 'Yakında bitecek ilan başlığı',
      category: 'genel',
      expires_at: soonDate.toISOString().slice(0, 10),
    });
    await service.create(userId, {
      ...validData,
      title: 'Daha sonra bitecek ilan başlığı',
      category: 'genel',
      expires_at: laterDate.toISOString().slice(0, 10),
    });
    const closed = await service.create(userId, {
      ...validData,
      title: 'Kapalı ilan başlığı',
      category: 'genel',
    });
    await service.updateStatus(userId, closed.id, 'kapandi');

    const page = await service.getAll(userId, { page: 1, limit: 2 });
    const summary = await service.getSummary(userId);

    expect(page.data).toHaveLength(2);
    expect(summary.total).toBe(6);
    expect(summary.endingSoon).toBe(1);
    expect(summary.closed).toBe(1);
  });
});

describe('ListingService — meta', () => {
  let service;
  beforeEach(async () => { service = new ListingService(await makeDb()); });

  test('kategorileri dönmeli', () => {
    expect(service.getCategories()).toEqual(VALID_CATEGORIES);
  });
  test('fakülteleri dönmeli', () => {
    expect(service.getFaculties()).toEqual(VALID_FACULTIES);
  });
});
