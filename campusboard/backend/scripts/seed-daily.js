/**
 * seed-daily.js
 * Her çalıştığında veritabanına 3-5 gerçekçi ilan ekler.
 *
 * Çalıştır:
 *   node scripts/seed-daily.js
 *   DATABASE_URL=<url> node scripts/seed-daily.js
 */

require('dotenv').config();
const { createDb } = require('../src/db');

// ── İçerik havuzu ─────────────────────────────────────────────────────────────

const LISTINGS = [
  { title: 'Veri Yapıları ve Algoritmalar — Haftalık Özet Notlar',
    description: 'Her haftanın konularını özetleyen A4 spiral notlar. Bağlı listeler, ağaçlar, grafikler ve sıralama algoritmaları dahil. Fotokopi çekerek vereceğim.',
    category: 'ders-notu', faculty: 'muhendislik', contact: 'notlar@istanbularel.edu.tr' },
  { title: 'Diferansiyel Denklemler 2024 — El Yazısı Notlar',
    description: 'Hocanın anlattığı tüm konuları kapsayan detaylı notlar. Örnek çözümler ve formül özetleri eklenmiş. Kütüphanede buluşup verebilirim.',
    category: 'ders-notu', faculty: 'muhendislik', contact: '05551234567' },
  { title: 'Mikro İktisat — Ders Slaytları ve Çözümlü Sorular',
    description: 'Profesörün slaytlarını düzenleyip çözümlü soru bankasıyla birleştirdim. Final için hazırladım, sizinle paylaşmak istedim.',
    category: 'ders-notu', faculty: 'iktisat', contact: 'mikro.iktisat@istanbularel.edu.tr' },
  { title: 'Türk Hukuku — Anayasa Hukuku Özet Notlar',
    description: 'Anayasa hukukunun tüm temel kavramları, içtihatlar ve önemli mahkeme kararları özetlenmiş. 40 sayfa, okunabilir el yazısı.',
    category: 'ders-notu', faculty: 'hukuk', contact: 'hukuk.notlari@istanbularel.edu.tr' },
  { title: 'Organik Kimya Laboratuvar Raporları — Örnek Format',
    description: 'Geçen dönem yazdığım tüm lab raporları, tam not aldığım versiyonlar. Format ve içerik açısından rehber niteliğinde.',
    category: 'ders-notu', faculty: 'fen-edebiyat', contact: '05557654321' },
  { title: 'Casio FX-991ES Plus Hesap Makinesi — Az Kullanılmış',
    description: 'Mühendislik bölümü için aldım, mezun olduğum için satıyorum. Tüm fonksiyonlar çalışıyor, kutusu mevcut. 350 TL.',
    category: 'ikinci-el', faculty: 'muhendislik', contact: '05323456789' },
  { title: 'Hukuk Fakültesi 1. Sınıf Ders Kitapları Seti',
    description: 'Medeni Hukuk, Ceza Hukuku, Anayasa Hukuku kitapları. Toplam 6 kitap, temiz durumda, üzerinde az kalem var. Seti 800 TL\'ye veriyorum.',
    category: 'ikinci-el', faculty: 'hukuk', contact: 'kitap.satis@istanbularel.edu.tr' },
  { title: 'Grafik Tablet — Wacom Intuus Small',
    description: 'Tasarım derslerinde kullandım, el çizimi projeler için ideal. Kalem dahil, çiziksizdri. 600 TL, pazarlık payı var.',
    category: 'ikinci-el', faculty: 'guzel-sanatlar', contact: '05391122334' },
  { title: 'HP Laptop — 8 GB RAM, i5 10. Nesil',
    description: 'Programlama dersleri için kullandım. Batarya 4 saat tutuyor, SSD disk, Windows 11 kurulu. 7500 TL, fatura mevcut.',
    category: 'ikinci-el', faculty: 'muhendislik', contact: '05441234000' },
  { title: 'Kariyer Zirvesi 2026 — Teknoloji Şirketleri Stant Açıyor',
    description: 'Fakültemiz organizasyonunda teknoloji şirketleri öğrencilerle buluşuyor. CV klinikleri ve mülakat simülasyonları da yapılacak. Katılım ücretsiz.',
    category: 'etkinlik', faculty: 'muhendislik', contact: '05501111222' },
  { title: 'Tiyatro Kulübü — Bahar Gösterisi Biletleri',
    description: 'Bu dönemin bahar gösterisi "Aşk ve Para" adlı oyun. Biletler sınırlı, öğrenci indirimi ile 50 TL. Cumartesi 19.00\'da sahne alıyoruz.',
    category: 'etkinlik', faculty: 'iletisim', contact: 'tiyatrokulup@istanbularel.edu.tr' },
  { title: 'Yazılım Geliştirici Stajyer — İstanbul Fintech Girişimi',
    description: 'React ve Node.js bilen stajyer arıyoruz. 3 aylık, haftada 3 gün uzaktan çalışma imkânı. Staj sonrası iş teklifi değerlendirilebilir.',
    category: 'staj', faculty: 'muhendislik', contact: 'hr@fintechstartup.com' },
  { title: 'Grafik Tasarım Stajı — Ajans Ortamı',
    description: 'Kreatif ajansımızda grafik tasarım stajyeri arıyoruz. Figma ve Adobe Creative Suite deneyimi bekliyoruz. Yarı zamanlı, 3 ay.',
    category: 'staj', faculty: 'guzel-sanatlar', contact: 'staj@kreatifajansi.com' },
  { title: 'Hukuk Bürosu Staj İmkânı — Şirketler Hukuku',
    description: 'İstanbul\'da faaliyet gösteren kurumsal hukuk büromuzda staj imkânı. Şirketler ve ticaret hukuku alanında deneyim kazanabilirsiniz.',
    category: 'staj', faculty: 'hukuk', contact: 'staj@hukukburo.av.tr' },
  { title: 'Kayıp: Mavi Vakko Kalem — A Blok Önünde',
    description: 'Pazartesi günü A Blok girişinde kaybettim. İçinde arkadaşımdan hediye gelen mavi metal Vakko kalem. Bulan lütfen iletişime geçsin.',
    category: 'kayip-bulundu', faculty: 'diger', contact: '05551239876' },
  { title: 'Bulundu: Kütüphanede Siyah Çanta',
    description: '2. kattaki çalışma alanında siyah sırt çantası bulundu. İçinde ders kitapları ve anahtarlık var. Güvenliğe teslim ettim.',
    category: 'kayip-bulundu', faculty: 'diger', contact: 'guvenlik@istanbularel.edu.tr' },
  { title: 'Kampüs Bisiklet Paylaşım Grubu Kuruldu',
    description: 'Kampüs içi ulaşımı kolaylaştırmak için bisiklet paylaşım grubu oluşturduk. WhatsApp grubuna katılmak isteyenler iletişime geçsin.',
    category: 'genel', faculty: 'diger', contact: '05441230099' },
  { title: 'Bölüm Dışı Ders Almak İsteyenler — Rehber',
    description: 'Bölüm dışı ders almanın tüm adımlarını, hangi bölümlerin hangi dersleri açık ettiğini ve ilan dönemlerini paylaşıyorum. DM atabilirsiniz.',
    category: 'genel', faculty: 'diger', contact: '05389998877' },
];

// ── Yardımcılar ────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomPastDate(minDaysAgo = 0, maxDaysAgo = 45) {
  const ms = Date.now() - (minDaysAgo + Math.random() * (maxDaysAgo - minDaysAgo)) * 86_400_000;
  return new Date(ms).toISOString();
}

function randomFutureDate(minDaysAhead = 7, maxDaysAhead = 60) {
  const ms = Date.now() + (minDaysAhead + Math.random() * (maxDaysAhead - minDaysAhead)) * 86_400_000;
  return new Date(ms).toISOString();
}

// ── Ana fonksiyon ──────────────────────────────────────────────────────────────

async function run() {
  const db = await createDb();

  // Mevcut kullanıcıları al
  const users = await db.all(
    `SELECT id FROM users WHERE university_slug = 'istanbul-arel-university'`
  );

  if (users.length === 0) {
    console.log('Kullanıcı bulunamadı, çıkılıyor.');
    return;
  }

  // Bugün zaten eklendi mi?
  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.get(
    `SELECT COUNT(*) AS c FROM listings
     WHERE created_at::date = ?::date AND contact LIKE '%seed%'`,
    [today]
  );
  if (Number(existing?.c) > 0) {
    console.log(`Bugün zaten ${existing.c} seed ilan eklendi, atlanıyor.`);
    return;
  }

  const count = 3 + Math.floor(Math.random() * 3); // 3-5 ilan
  const shuffled = [...LISTINGS].sort(() => Math.random() - 0.5).slice(0, count);

  let added = 0;
  for (const t of shuffled) {
    const userId    = pick(users).id;
    const createdAt = randomPastDate(0, 45);
    const expiresAt = Math.random() > 0.5 ? randomFutureDate(7, 60) : null;

    await db.run(
      `INSERT INTO listings
         (user_id, title, description, category, faculty, university_slug,
          contact, status, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'istanbul-arel-university', ?, 'aktif', ?, ?, ?)`,
      [userId, t.title, t.description, t.category, t.faculty,
       t.contact, expiresAt, createdAt, createdAt]
    );
    added++;
    console.log(`  ✅ [${t.category.padEnd(14)}] ${t.title.slice(0, 55)}`);
  }

  console.log(`\n🌱 ${added} ilan eklendi — ${new Date().toLocaleDateString('tr-TR')}`);
}

run().catch(err => {
  console.error('❌ Seed hatası:', err.message);
  process.exit(1);
});
