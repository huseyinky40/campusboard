const { CommentService }  = require('../src/services/commentService');
const { ListingService }  = require('../src/services/listingService');
const { createDb }        = require('../src/db');

async function makeDb() { return createDb(':memory:'); }

async function seedUser(db, email = 'user@test.com', name = 'Test User') {
  const r = await db.run(
    "INSERT INTO users (email, password, name) VALUES (?, 'hash', ?) RETURNING id",
    [email, name]
  );
  return r.rows[0].id;
}

async function seedExternalUser(db) {
  const r = await db.run(
    `INSERT INTO users (email, password, name, university_slug, university_name, university_domain)
     VALUES ('ext@other.edu', 'hash', 'External', 'other-uni', 'Other Uni', 'other.edu') RETURNING id`
  );
  return r.rows[0].id;
}

const validListing = {
  title: 'Test İlanı Başlığı',
  description: 'Bu bir test açıklamasıdır, yeterince uzun.',
  category: 'ders-notu',
  faculty: 'muhendislik',
  contact: 'test@uni.edu',
};

describe('CommentService — getByListing', () => {
  let db, commentService, listingService, ownerId, listingId;

  beforeEach(async () => {
    db = await makeDb();
    commentService = new CommentService(db);
    listingService = new ListingService(db);
    ownerId = await seedUser(db, 'owner@test.com', 'Owner');
    const listing = await listingService.create(ownerId, validListing);
    listingId = listing.id;
  });

  test('boş ilan için boş yorum listesi ve listing_owner_id dönmeli', async () => {
    const { comments, listing_owner_id } = await commentService.getByListing(ownerId, listingId);
    expect(comments).toHaveLength(0);
    expect(listing_owner_id).toBe(ownerId);
  });

  test('yorum eklendikten sonra listede görünmeli', async () => {
    await commentService.create(ownerId, listingId, 'Merhaba!');
    const { comments } = await commentService.getByListing(ownerId, listingId);
    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe('Merhaba!');
    expect(comments[0].author_name).toBe('Owner');
  });

  test('farklı üniversite kullanıcısı ilanı görememeli — not_found hatası', async () => {
    const extId = await seedExternalUser(db);
    await expect(commentService.getByListing(extId, listingId)).rejects.toMatchObject({ type: 'not_found' });
  });

  test('olmayan ilan için not_found hatası', async () => {
    await expect(commentService.getByListing(ownerId, 9999)).rejects.toMatchObject({ type: 'not_found' });
  });
});

describe('CommentService — create', () => {
  let db, commentService, listingService, ownerId, otherId, listingId;

  beforeEach(async () => {
    db = await makeDb();
    commentService = new CommentService(db);
    listingService = new ListingService(db);
    ownerId = await seedUser(db, 'owner@test.com', 'Owner');
    otherId = await seedUser(db, 'other@test.com', 'Other');
    const listing = await listingService.create(ownerId, validListing);
    listingId = listing.id;
  });

  test('geçerli yorumu oluşturabilmeli', async () => {
    const comment = await commentService.create(otherId, listingId, 'Harika ilan!');
    expect(comment.content).toBe('Harika ilan!');
    expect(comment.user_id).toBe(otherId);
    expect(comment.parent_id).toBeNull();
  });

  test('çok kısa yorum (< 2 karakter) validation hatası vermeli', async () => {
    await expect(commentService.create(otherId, listingId, 'x')).rejects.toMatchObject({ type: 'validation' });
  });

  test('çok uzun yorum (> 500 karakter) validation hatası vermeli', async () => {
    const longContent = 'a'.repeat(501);
    await expect(commentService.create(otherId, listingId, longContent)).rejects.toMatchObject({ type: 'validation' });
  });

  test('500 karakter sınırında yorum kabul edilmeli', async () => {
    const content = 'a'.repeat(500);
    const comment = await commentService.create(otherId, listingId, content);
    expect(comment.content).toBe(content);
  });

  test('boş/whitespace içerik validation hatası vermeli', async () => {
    await expect(commentService.create(otherId, listingId, '   ')).rejects.toMatchObject({ type: 'validation' });
  });

  test('içerik trim edilmeli', async () => {
    const comment = await commentService.create(otherId, listingId, '  Güzel ilan  ');
    expect(comment.content).toBe('Güzel ilan');
  });

  test('olmayan ilana yorum yapılamaz — not_found', async () => {
    await expect(commentService.create(otherId, 9999, 'deneme')).rejects.toMatchObject({ type: 'not_found' });
  });

  test('farklı üniversite kullanıcısı yorum yapamaz — not_found', async () => {
    const extId = await seedExternalUser(db);
    await expect(commentService.create(extId, listingId, 'deneme')).rejects.toMatchObject({ type: 'not_found' });
  });

  test('dönen yorum author_name içermeli', async () => {
    const comment = await commentService.create(otherId, listingId, 'Test');
    expect(comment.author_name).toBe('Other');
  });
});

describe('CommentService — replies (parent_id)', () => {
  let db, commentService, listingService, ownerId, otherId, listingId, parentCommentId;

  beforeEach(async () => {
    db = await makeDb();
    commentService = new CommentService(db);
    listingService = new ListingService(db);
    ownerId = await seedUser(db, 'owner@test.com', 'Owner');
    otherId = await seedUser(db, 'other@test.com', 'Other');
    const listing = await listingService.create(ownerId, validListing);
    listingId = listing.id;
    const parent = await commentService.create(otherId, listingId, 'Ana yorum');
    parentCommentId = parent.id;
  });

  test('geçerli parent_id ile yanıt oluşturabilmeli', async () => {
    const reply = await commentService.create(ownerId, listingId, 'Yanıt!', parentCommentId);
    expect(reply.parent_id).toBe(parentCommentId);
    expect(reply.content).toBe('Yanıt!');
  });

  test('yanıt getByListing sonucunda parent_id ile dönmeli', async () => {
    await commentService.create(ownerId, listingId, 'Yanıt!', parentCommentId);
    const { comments } = await commentService.getByListing(ownerId, listingId);
    const reply = comments.find(c => c.parent_id === parentCommentId);
    expect(reply).toBeDefined();
    expect(reply.content).toBe('Yanıt!');
  });

  test('geçersiz parent_id validation hatası vermeli', async () => {
    await expect(commentService.create(ownerId, listingId, 'Yanıt!', 9999)).rejects.toMatchObject({ type: 'validation' });
  });

  test('başka ilan yorumunu parent olarak kullanamaz', async () => {
    const listing2 = await listingService.create(ownerId, validListing);
    const otherComment = await commentService.create(otherId, listing2.id, 'Başka ilan yorumu');
    await expect(commentService.create(ownerId, listingId, 'Yanıt!', otherComment.id)).rejects.toMatchObject({ type: 'validation' });
  });
});

describe('CommentService — delete', () => {
  let db, commentService, listingService, ownerId, userId1, userId2, listingId, commentId;

  beforeEach(async () => {
    db = await makeDb();
    commentService = new CommentService(db);
    listingService = new ListingService(db);
    ownerId  = await seedUser(db, 'owner@test.com', 'Owner');
    userId1  = await seedUser(db, 'user1@test.com', 'User1');
    userId2  = await seedUser(db, 'user2@test.com', 'User2');
    const listing = await listingService.create(ownerId, validListing);
    listingId = listing.id;
    const comment = await commentService.create(userId1, listingId, 'Bir yorum');
    commentId = comment.id;
  });

  test('yorum sahibi kendi yorumunu silebilmeli', async () => {
    const result = await commentService.delete(userId1, listingId, commentId);
    expect(result).toBe(true);
    const { comments } = await commentService.getByListing(ownerId, listingId);
    expect(comments).toHaveLength(0);
  });

  test('ilan sahibi başkasının yorumunu silebilmeli', async () => {
    const result = await commentService.delete(ownerId, listingId, commentId);
    expect(result).toBe(true);
  });

  test('üçüncü kişi başkasının yorumunu silemez — forbidden', async () => {
    await expect(commentService.delete(userId2, listingId, commentId)).rejects.toMatchObject({ type: 'forbidden' });
  });

  test('olmayan yorum için false dönmeli', async () => {
    const result = await commentService.delete(userId1, listingId, 9999);
    expect(result).toBe(false);
  });

  test('farklı üniversite kullanıcısı silemez — false (listing bulunamaz)', async () => {
    const extId = await seedExternalUser(db);
    const result = await commentService.delete(extId, listingId, commentId);
    expect(result).toBe(false);
  });

  test('silinen yanıtlar da cascade ile silinmeli', async () => {
    const reply = await commentService.create(ownerId, listingId, 'Yanıt', commentId);
    await commentService.delete(userId1, listingId, commentId);
    const { comments } = await commentService.getByListing(ownerId, listingId);
    expect(comments.find(c => c.id === reply.id)).toBeUndefined();
  });

  test('silinmiş yorum getByListing sonucunda görünmemeli', async () => {
    await commentService.delete(userId1, listingId, commentId);
    const { comments } = await commentService.getByListing(ownerId, listingId);
    expect(comments).toHaveLength(0);
  });
});

describe('CommentService — çoklu yorum', () => {
  let db, commentService, listingService, ownerId, listingId;

  beforeEach(async () => {
    db = await makeDb();
    commentService = new CommentService(db);
    listingService = new ListingService(db);
    ownerId = await seedUser(db);
    const listing = await listingService.create(ownerId, validListing);
    listingId = listing.id;
  });

  test('yorumlar created_at ASC sırasıyla dönmeli', async () => {
    const u1 = await seedUser(db, 'a@test.com', 'A');
    const u2 = await seedUser(db, 'b@test.com', 'B');
    await commentService.create(u1, listingId, 'İlk yorum');
    await commentService.create(u2, listingId, 'İkinci yorum');
    const { comments } = await commentService.getByListing(ownerId, listingId);
    expect(comments[0].content).toBe('İlk yorum');
    expect(comments[1].content).toBe('İkinci yorum');
  });

  test('farklı ilan yorumları birbirine karışmamalı', async () => {
    const listing2 = await listingService.create(ownerId, validListing);
    await commentService.create(ownerId, listingId, 'İlan 1 yorumu');
    await commentService.create(ownerId, listing2.id, 'İlan 2 yorumu');
    const { comments: c1 } = await commentService.getByListing(ownerId, listingId);
    const { comments: c2 } = await commentService.getByListing(ownerId, listing2.id);
    expect(c1).toHaveLength(1);
    expect(c2).toHaveLength(1);
    expect(c1[0].content).toBe('İlan 1 yorumu');
    expect(c2[0].content).toBe('İlan 2 yorumu');
  });

  test('ilan silinince yorumlar cascade silinmeli', async () => {
    await commentService.create(ownerId, listingId, 'Silinecek yorum');
    await db.run('DELETE FROM listings WHERE id = ?', [listingId]);
    const rows = await db.all('SELECT * FROM comments WHERE listing_id = ?', [listingId]);
    expect(rows).toHaveLength(0);
  });
});
