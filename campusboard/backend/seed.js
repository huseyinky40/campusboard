require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createDb } = require('./src/db');

const USERS = [
  { name: 'Ahmet Yılmaz',    email: 'ahmet.yilmaz22@istanbularel.edu.tr'  },
  { name: 'Zeynep Kaya',     email: 'zeynep.kaya21@istanbularel.edu.tr'   },
  { name: 'Mert Demir',      email: 'mert.demir23@istanbularel.edu.tr'    },
];

const LISTINGS = [
  // Ders Notu
  { title: 'Calculus II — Tam Konu Özeti + Soru Bankası', description: 'Ara sınav ve final kapsamındaki tüm konuları içeren, elle yazılmış ders notu. Limit, türev, integral ve seriler detaylıca işlenmiş. 85 sayfa, okunakli el yazısı.', category: 'ders-notu', faculty: 'muhendislik', contact: 'DM veya WhatsApp: 0532 111 22 33' },
  { title: 'Veri Yapıları ve Algoritmalar — Sınav Notları', description: 'Linked list, ağaç yapıları, graph algoritmaları ve dinamik programlama konularını kapsayan kapsamlı özet. Geçmiş sınav soruları çözümlü.', category: 'ders-notu', faculty: 'muhendislik', contact: 'ahmet.yilmaz22@istanbularel.edu.tr' },
  { title: 'Mikro İktisat — Ders Slaytları ve Özetler', description: 'Arz-talep, piyasa dengeleri, üretici teorisi konularında hazırlanmış özet notlar. Hoca\'nın vurguladığı tüm formüller dahil.', category: 'ders-notu', faculty: 'iktisat', contact: 'zeynep.kaya21@istanbularel.edu.tr' },
  { title: 'Medeni Hukuk — Kişiler Hukuku Özeti', description: 'Kişiliğin başlangıcı, sona ermesi, gerçek ve tüzel kişiler konularında hazırlanmış final özeti. Yargıtay kararları dahil.', category: 'ders-notu', faculty: 'hukuk', contact: 'DM ile ulaşın' },
  { title: 'Türkçe Dil Bilgisi — AYT Hazırlık Notu', description: 'Paragraf soruları, cümle tamamlama ve dil bilgisi kurallarını kapsayan 60 sayfalık özet. Her konudan örnek sorular mevcut.', category: 'ders-notu', faculty: 'fen-edebiyat', contact: 'mert.demir23@istanbularel.edu.tr' },
  { title: 'Genel Muhasebe — Dönem Sonu İşlemleri', description: 'Bilanço düzenlemeleri, amortisman kayıtları ve dönem sonu muhasebe işlemlerini anlatan detaylı not. Çözümlü örnekler içeriyor.', category: 'ders-notu', faculty: 'iktisat', contact: 'ahmet.yilmaz22@istanbularel.edu.tr' },

  // Staj
  { title: 'Frontend Developer Stajı — Anadolu Grubu (Yaz 2025)', description: 'Anadolu Grubu\'nda Yaz 2025 dönemi için React.js odaklı frontend staj pozisyonu. Haftada 5 gün, hibrit çalışma. CV ve portfolyo ile başvurabilirsiniz.', category: 'staj', faculty: 'muhendislik', contact: 'staj@anadolugrubu.com.tr' },
  { title: 'Hukuk Bürosu Avukatlık Stajı — İstanbul Avrupa Yakası', description: 'Ticaret ve şirketler hukuku alanında çalışan köklü bir hukuk bürosunda staj imkânı. Haftada 3 gün, belge hazırlama ve duruşma takibi.', category: 'staj', faculty: 'hukuk', contact: 'DM ile özgeçmişinizi gönderin' },
  { title: 'Grafik Tasarım Stajı — Reklam Ajansı (Uzaktan)', description: 'Butik reklam ajansında tam uzaktan, esnek saatli grafik tasarım stajı. Adobe CC bilgisi şart. Aylık 3.500₺ ödeme mevcut.', category: 'staj', faculty: 'guzel-sanatlar', contact: 'zeynep.kaya21@istanbularel.edu.tr' },
  { title: 'Muhasebe/Finans Stajı — Orta Ölçekli Üretim Firması', description: 'Kadıköy\'de faaliyet gösteren üretim firmasında muhasebe departmanında staj. Haftada 4 gün yüz yüze, SGK destekli.', category: 'staj', faculty: 'iktisat', contact: '0216 444 55 66' },
  { title: 'İçerik Üretimi & Sosyal Medya Stajı', description: 'Büyüyen bir e-ticaret markasında Instagram/TikTok içerik üretimi ve sosyal medya yönetimi stajı. Yaratıcı merak ön planda. Uzaktan.', category: 'staj', faculty: 'iletisim', contact: 'kariyer@marka.com.tr' },

  // İkinci El
  { title: 'Casio FX-991EX Bilimsel Hesap Makinesi', description: 'Mühendislik ve fen bilimleri için ideal, 552 fonksiyonlu hesap makinesi. 1 yıl kullanıldı, ekranında çizik yok. Orijinal kutusu ve kılıfı mevcut.', category: 'ikinci-el', faculty: 'muhendislik', contact: 'WhatsApp: 0543 222 33 44' },
  { title: 'Adobe Creative Cloud 1 Yıllık Lisans (Paylaşımlı)', description: 'Photoshop, Illustrator, Premiere ve tüm CC uygulamalarına erişim. 4 kişilik plana 1 slot açıldı. Aylık 250₺.', category: 'ikinci-el', faculty: 'guzel-sanatlar', contact: 'mert.demir23@istanbularel.edu.tr' },
  { title: 'Ders Kitapları — Hukuk 1. Sınıf Seti (5 Kitap)', description: 'Medeni Hukuk, Anayasa Hukuku, Roma Hukuku, Borçlar Hukuku ve İdare Hukuku kitapları. Hepsi 2022 baskı, altı çizili ama okunaklı.', category: 'ikinci-el', faculty: 'hukuk', contact: 'ahmet.yilmaz22@istanbularel.edu.tr' },
  { title: 'Logitech MX Master 3 Kablosuz Mouse', description: '8 ay kullanıldı, kusursuz çalışıyor. Ergonomik tasarım, şarj edilebilir, Bluetooth + USB alıcı. Kutusu mevcut. 850₺ (piyasa fiyatı 1.400₺).', category: 'ikinci-el', faculty: 'muhendislik', contact: 'DM ile iletişime geçin' },
  { title: 'IELTS & YDS Kaynak Kitap Seti', description: 'Cambridge IELTS 1-15 kitapları, Kaplan YDS seti ve 3 adet özgün deneme kitabı. Toplam 22 kitap, temiz. 600₺ toplu satış.', category: 'ikinci-el', faculty: 'fen-edebiyat', contact: 'zeynep.kaya21@istanbularel.edu.tr' },

  // Kayıp / Bulundu
  { title: 'KAYIP — Siyah Moleskine Defter (A5)', description: 'Mühendislik binası C blok 3. kat tuvaletinde unutulan siyah Moleskine A5 defter. İçinde proje notları var, çok önemli. Bulan lütfen iletişime geçsin.', category: 'kayip-bulundu', faculty: 'muhendislik', contact: 'ahmet.yilmaz22@istanbularel.edu.tr' },
  { title: 'BULUNDU — Kırmızı Şemsiye, Kütüphane Girişi', description: 'Merkez kütüphane girişinde unutulmuş kırmızı çiçekli şemsiye bulundu. Güvenlik görevlisine teslim edildi. Sahibi kimlik göstererek alabilir.', category: 'kayip-bulundu', faculty: 'diger', contact: 'Güvenlik — Ana Bina' },
  { title: 'KAYIP — Mavi Basküleli Çanta (İçinde Laptop)', description: 'Salı günü kafeterya yakınında kaybolan açık mavi basküleli sırt çantası. İçinde Dell laptop ve ders notları var. Lütfen acil ulaşın!', category: 'kayip-bulundu', faculty: 'iktisat', contact: 'WhatsApp: 0555 999 00 11' },
  { title: 'BULUNDU — AirPods Pro Kutusu, Spor Salonu', description: 'Spor salonunun soyunma odasında AirPods Pro kutu ve kılıfı bulundu. Seri numarası eşleşmesi şartıyla teslim edilecek.', category: 'kayip-bulundu', faculty: 'diger', contact: 'mert.demir23@istanbularel.edu.tr' },

  // Etkinlik
  { title: 'Kariyer Günleri 2025 — Şirket Standları & CV Klinikleri', description: 'Kampüste düzenlenecek Kariyer Günleri\'nde 30+ şirket stant açacak. CV klinik randevularını şimdiden ayırtın. 15–16 Mayıs, Ana Amfi Fuayesi.', category: 'etkinlik', faculty: 'diger', contact: 'kariyergunleri@istanbularel.edu.tr' },
  { title: 'Yapay Zeka & Makine Öğrenmesi Atölyesi', description: 'Python ile sıfırdan makine öğrenmesi modelleri kurmayı öğreneceğiniz 3 günlük atölye. Ön kayıt zorunlu, kontenjan 25 kişi.', category: 'etkinlik', faculty: 'muhendislik', contact: 'zeynep.kaya21@istanbularel.edu.tr' },
  { title: 'Uluslararası Hukuk Sempozyumu — Tebliğ Çağrısı', description: 'Hukuk Fakültesi\'nin düzenlediği uluslararası sempozyum için öğrenci tebliğleri kabul edilmektedir. Son başvuru 30 Mayıs.', category: 'etkinlik', faculty: 'hukuk', contact: 'hukuk.sempozyum@istanbularel.edu.tr' },

  // Genel
  { title: 'Ders Çalışma Grubu Arıyorum — 3. Sınıf Mühendislik', description: 'Sayısal yöntemler ve sinyal işleme derslerinde birlikte çalışacak 2–3 kişilik grup arıyorum. Hafta içi öğleden sonra kampüste buluşabiliriz.', category: 'genel', faculty: 'muhendislik', contact: 'ahmet.yilmaz22@istanbularel.edu.tr' },
  { title: 'Kiralık Bisiklet — Kampüs İçi Ulaşım', description: 'Dersler arası kampüs içi ulaşım için günlük / haftalık bisiklet kiralama. Şehir bisikleti, kilidi ve kaskı dahil. Günlük 40₺.', category: 'genel', faculty: 'diger', contact: 'WhatsApp: 0532 777 88 99' },
  { title: 'Özel Ders — İngilizce Konuşma & IELTS Hazırlık', description: 'IELTS 7.5 puanlı, yurt dışı eğitim deneyimi olan 4. sınıf öğrencisinden özel İngilizce dersi. Saatlik 250₺, online veya yüz yüze.', category: 'genel', faculty: 'fen-edebiyat', contact: 'mert.demir23@istanbularel.edu.tr' },
];

async function seed() {
  const db = await createDb(process.env.DATABASE_URL);
  const pwHash = bcrypt.hashSync('Test1234!', 10);
  const slug = 'istanbul-arel-university';
  const name = 'İstanbul Arel Üniversitesi';
  const domain = 'istanbularel.edu.tr';
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const userIds = [];
  for (const u of USERS) {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [u.email]);
    if (existing) {
      userIds.push(existing.id);
      console.log(`Kullanıcı zaten var: ${u.email}`);
      continue;
    }
    const result = await db.run(
      `INSERT INTO users (email, password, name, university_slug, university_name, university_domain, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [u.email, pwHash, u.name, slug, name, domain, true]
    );
    const id = result.rows?.[0]?.id
      || (await db.get('SELECT id FROM users WHERE email = ?', [u.email])).id;
    userIds.push(id);
    console.log(`Kullanıcı oluşturuldu: ${u.email} (id=${id})`);
  }

  let created = 0;
  for (let i = 0; i < LISTINGS.length; i++) {
    const l = LISTINGS[i];
    const userId = userIds[i % userIds.length];
    const daysAgo = Math.floor(Math.random() * 14);
    const expiresAt = new Date(Date.now() + (30 - daysAgo) * 86400000).toISOString();
    await db.run(
      `INSERT INTO listings (user_id, title, description, category, faculty, university_slug, contact, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, l.title, l.description, l.category, l.faculty, slug, l.contact, expiresAt]
    );
    created++;
    console.log(`  [${created}] ${l.category.padEnd(15)} — ${l.title.slice(0, 55)}`);
  }

  console.log(`\n✓ ${created} ilan ve ${userIds.length} kullanıcı eklendi.`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
