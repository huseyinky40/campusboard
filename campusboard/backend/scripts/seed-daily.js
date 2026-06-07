/**
 * seed-daily.js
 * Bileşen havuzlarından rastgele kombinasyonlar üreterek her gün
 * 3-5 benzersiz ilan ekler. Havuz 1000+ farklı kombinasyonu destekler.
 *
 * Çalıştır:
 *   node scripts/seed-daily.js
 *   DATABASE_URL=<url> node scripts/seed-daily.js
 */

require('dotenv').config();
const { createDb } = require('../src/db');

// ── Bileşen havuzları ──────────────────────────────────────────────────────────

const COMPONENTS = {

  'ders-notu': {
    faculty: ['muhendislik','iktisat','hukuk','fen-edebiyat','iletisim','egitim','guzel-sanatlar','diger'],
    subjects: [
      'Calculus I','Calculus II','Calculus III','Lineer Cebir','Diferansiyel Denklemler',
      'İstatistik','Olasılık Teorisi','Sayısal Analiz','Ayrık Matematik',
      'Veri Yapıları','Algoritmalar','Nesne Yönelimli Programlama',
      'Veritabanı Yönetim Sistemleri','Bilgisayar Ağları','İşletim Sistemleri',
      'Yazılım Mühendisliği','Yapay Zeka','Makine Öğrenmesi','Web Programlama',
      'Devre Analizi','Elektromanyetik Teori','Termodinamik','Akışkanlar Mekaniği',
      'Mekanik','Mukavemet','Malzeme Bilimi','Kontrol Sistemleri',
      'Mikro İktisat','Makro İktisat','Para ve Bankacılık','Uluslararası Ticaret',
      'Muhasebe I','Muhasebe II','Finansal Yönetim','Pazarlama Yönetimi',
      'İşletme İlkeleri','Girişimcilik','Yönetim Muhasebesi','Denetim',
      'Anayasa Hukuku','Medeni Hukuk','Borçlar Hukuku','Ticaret Hukuku',
      'Ceza Hukuku','İdare Hukuku','Uluslararası Hukuk','Miras Hukuku',
      'Medeni Usul Hukuku','İş Hukuku','Vergi Hukuku','Kriminoloji',
      'Genel Kimya','Organik Kimya','Fizik I','Fizik II',
      'Biyoloji','Mikrobiyoloji','Genetik','Ekoloji','Botanik',
      'Medya Teorileri','Gazetecilik','Halkla İlişkiler','Reklam',
      'Görsel İletişim Tasarımı','Sinema','Radyo Televizyon','Sosyal Medya Yönetimi',
      'Eğitim Psikolojisi','Sınıf Yönetimi','Öğretim Teknolojileri','Ölçme ve Değerlendirme',
      'Renk Teorisi','Tipografi','Grafik Tasarım','İllüstrasyon',
      'Heykel','Seramik','Resim','Fotoğrafçılık',
      'Türk Dili','İngilizce','Almanca','Felsefe','Sosyoloji','Psikoloji','Tarih',
    ],
    formats: [
      'El Yazısı Notlar','Özet Notlar','Çözümlü Sorular','Slayt Özetleri',
      'Formül Kartları','Konu Anlatımı','Vize Soruları','Final Soruları',
      'Alıştırmalar','Hoca Notları','Kaynak Kitap Özeti',
    ],
    desc_templates: [
      '{subject} dersinin tüm konularını kapsayan {format}. Sınavlara hazırlık için birebir.',
      'Hocanın anlattığı tüm {subject} konuları adım adım açıklanmış. {format} formatında.',
      '{subject} final sınavına hazırlık için hazırladığım {format}. Örnek çözümler dahil.',
      '{subject} dersi için hazırladığım kapsamlı {format}. Vize ve final konuları eksiksiz.',
      'Bu dönem {subject} dersinde A aldım; kullandığım {format} sizinle paylaşıyorum.',
      '{subject} konularını basit anlatımla özetleyen {format}. Kütüphanede buluşup verebilirim.',
      '{subject} için hazırladığım {format}. Hoca notları ve kitap özetleri bir arada.',
    ],
    contact_pool: [
      'notlar@istanbularel.edu.tr','05551234567','05339876543',
      'dersnotlari@istanbularel.edu.tr','05441112233',
    ],
  },

  'ikinci-el': {
    faculty: ['muhendislik','iktisat','hukuk','fen-edebiyat','iletisim','guzel-sanatlar','diger'],
    items: [
      { name: 'Casio FX-991ES Plus Hesap Makinesi', price: '350', detail: 'tüm fonksiyonlar çalışıyor, kutusu mevcut' },
      { name: 'Texas Instruments TI-84 Grafik Hesap Makinesi', price: '900', detail: 'şarj kablosu ve kılıfı ile birlikte' },
      { name: 'HP Prime Grafik Hesap Makinesi', price: '1200', detail: 'az kullanılmış, dokunmatik ekran sağlam' },
      { name: 'Mühendislik Çizim Seti', price: '150', detail: 'pergel, cetvel, gönye takımı eksiksiz' },
      { name: 'AutoCAD Eğitim Lisansı', price: '200', detail: '1 yıllık, devredilebilir öğrenci lisansı' },
      { name: 'Arduino Starter Kit', price: '400', detail: 'tüm parçalar mevcut, orijinal kutu' },
      { name: 'Raspberry Pi 4 (4GB)', price: '1800', detail: 'muhafaza ve güç adaptörü dahil' },
      { name: 'Wacom Intuus Small Grafik Tablet', price: '650', detail: 'kalem ve USB kablo dahil, çizik yok' },
      { name: 'Wacom Intuus Medium Grafik Tablet', price: '950', detail: 'az kullanılmış, el izleme hassasiyeti tam' },
      { name: 'Canon EOS M50 Fotoğraf Makinesi', price: '8500', detail: '18-150mm lens dahil, 3000 deklanşör' },
      { name: 'Sony ZV-1 Vlog Kamerası', price: '6500', detail: 'orijinal kutu, ekstra batarya dahil' },
      { name: 'MacBook Air M1 (8GB/256GB)', price: '22000', detail: '2021 model, fatura mevcut, batarya %94' },
      { name: 'MacBook Pro M2 (16GB/512GB)', price: '38000', detail: '2023 model, 6 ay kullanılmış, kutusunda' },
      { name: 'HP Laptop i5 10. Nesil 8GB', price: '7500', detail: 'SSD disk, Windows 11, fatura var' },
      { name: 'Dell Inspiron 15 i7 16GB', price: '12000', detail: '2022 model, gaming için uygun' },
      { name: 'iPad Air 5. Nesil + Apple Pencil', price: '18000', detail: 'Smart Folio kılıf ile birlikte' },
      { name: 'Samsung Galaxy Tab S8', price: '12000', detail: 'S-Pen dahil, klavye kılıf ayrı satılır' },
      { name: 'Hukuk 1. Sınıf Ders Kitapları Seti (6 Kitap)', price: '800', detail: 'Medeni, Ceza, Anayasa, Borçlar dahil' },
      { name: 'İktisat 2. Sınıf Ders Kitapları (5 Kitap)', price: '600', detail: 'Mankiw Ekonomi dahil, az kalem var' },
      { name: 'Mühendislik 1. Sınıf Kitap Seti', price: '500', detail: 'Fizik, Kimya, Calculus kitapları' },
      { name: 'Keman (3/4 Boy) + Kutu + Yay', price: '2500', detail: 'başlangıç seviyesi, temiz durum' },
      { name: 'Gitar + Çanta + Pena Seti', price: '1200', detail: 'akustik, 4 aydır çalınmıyor' },
      { name: 'Boya Seti (Yağlı + Akrilik)', price: '350', detail: '40 renk, bazıları yarım tüp' },
      { name: 'Çizim Masası + Sandalye', price: '2200', detail: 'A2 boyut, ayarlanabilir açı' },
      { name: 'Mikroskop (40x-1000x)', price: '1800', detail: 'lam ve lamel seti dahil, çanta var' },
      { name: 'Profesyonel Stetoskop', price: '900', detail: 'Littmann Classic III, az kullanılmış' },
      { name: 'Tıp Atlası (Netter)', price: '700', detail: '7. baskı, Türkçe, kapağı biraz yıpranmış' },
      { name: 'Daktilo (Olympia SM9)', price: '1500', detail: 'çalışıyor, şerit yeni takıldı' },
      { name: 'Mini Buzdolabı (45L)', price: '1800', detail: 'yurt odası için ideal, gürültüsüz' },
      { name: 'Masa Lambası (LED, göz koruyucu)', price: '350', detail: 'USB şarjlı, kol ayarlanabilir' },
    ],
    desc_templates: [
      '{item_name} satıyorum. {item_detail}. {price} TL, pazarlık payı var.',
      'Mezun olduğum için {item_name} satıyorum. {item_detail}. Fiyat: {price} TL.',
      '{item_name} elden çıkarıyorum. {item_detail}. {price} TL, kampüste teslim.',
      'Bölüm değiştirdiğim için {item_name} satılık. {item_detail}. {price} TL sabit.',
      '{item_name} — az kullanılmış. {item_detail}. {price} TL, fiyat konuşulur.',
      'Yurt dışına gidiyorum, {item_name} satıyorum. {item_detail}. {price} TL.',
    ],
    contact_pool: [
      '05323456789','05441234000','05551239876','05339001122',
      '05462223344','05387776655','satlik@istanbularel.edu.tr',
    ],
  },

  'etkinlik': {
    faculty: ['muhendislik','iktisat','hukuk','iletisim','fen-edebiyat','egitim','guzel-sanatlar','diger'],
    events: [
      { name: 'Kariyer Zirvesi', detail: 'sektör temsilcileri ve CV klinikleri' },
      { name: 'Teknoloji Hackathon', detail: '24 saatlik yazılım yarışması, ödüller mevcut' },
      { name: 'Girişimcilik Paneli', detail: 'başarılı girişimciler deneyimlerini paylaşıyor' },
      { name: 'Mezun Buluşması', detail: 'networking ve iş fırsatları' },
      { name: 'Bahar Şenliği', detail: 'konserler, yarışmalar ve stantlar' },
      { name: 'Bilim Fuarı', detail: 'proje sergileri ve jüri değerlendirmesi' },
      { name: 'Model BM Konferansı', detail: 'uluslararası simülasyon, İngilizce' },
      { name: 'Tiyatro Gösterisi', detail: 'öğrenci topluluğunun bahar oyunu' },
      { name: 'Fotoğraf Sergisi', detail: 'öğrenci işleri, açılış kokteyli var' },
      { name: 'Kısa Film Festivali', detail: 'öğrenci yapımı filmler, ödül töreni' },
      { name: 'Satranç Turnuvası', detail: 'tüm bölümler katılabilir, kupa verilecek' },
      { name: 'Yüzme Turnuvası', detail: 'fakültelerarası, birden fazla kategori' },
      { name: 'Futbol Turnuvası', detail: 'bölüm takımları, eleme usulü' },
      { name: 'E-Spor Turnuvası', detail: 'Valorant ve FIFA kategorileri' },
      { name: 'Yoga ve Meditasyon Atölyesi', detail: 'sınav stresi için, ücretsiz katılım' },
      { name: 'Python Programlama Bootcamp', detail: '3 günlük yoğun kurs, sertifikalı' },
      { name: 'Fintech Konferansı', detail: 'kripto, blokzincir ve dijital bankacılık' },
      { name: 'Hukuk Öğrencileri Sempozyumu', detail: 'panel ve sunum yarışması' },
      { name: 'Kitap Kulübü Buluşması', detail: 'aylık toplantı, bu ay Orhan Pamuk' },
      { name: 'Tasarım Atölyesi', detail: 'Figma ve UI/UX temelleri, ücretsiz' },
    ],
    desc_templates: [
      'Fakültemiz {event_name} etkinliğini düzenliyor. {event_detail}. Katılım {fee}.',
      'Bu hafta {event_name} var! {event_detail}. Yerler sınırlı.',
      '{event_name} etkinliğine davetlisiniz. {event_detail}. Kaydınızı yaptırmayı unutmayın.',
      '{event_name} için kayıtlar açıldı. {event_detail}. Son katılım tarihi yaklaşıyor.',
    ],
    fees: ['ücretsiz', '50 TL', '75 TL', '100 TL', 'öğrenciye özel indirimli'],
    contact_pool: [
      'etkinlik@istanbularel.edu.tr','ogrenci.birligi@istanbularel.edu.tr',
      '05501111222','05339988776','kulup@istanbularel.edu.tr',
    ],
  },

  'staj': {
    faculty: ['muhendislik','iktisat','hukuk','iletisim','guzel-sanatlar','diger'],
    roles: [
      { title: 'Yazılım Geliştirici Stajyer', detail: 'React, Node.js veya Python deneyimi bekleniyor' },
      { title: 'Frontend Geliştirici Stajyer', detail: 'HTML/CSS/JavaScript temelleri yeterli' },
      { title: 'Backend Geliştirici Stajyer', detail: 'veritabanı ve API geliştirme deneyimi artı' },
      { title: 'Mobil Uygulama Stajyeri', detail: 'Flutter veya React Native bilen tercih edilir' },
      { title: 'Veri Analisti Stajyer', detail: 'Python/R ve Excel, istatistik bilgisi şart' },
      { title: 'Yapay Zeka Stajyeri', detail: 'ML temellerine hakim, Pytorch/TensorFlow' },
      { title: 'Siber Güvenlik Stajyeri', detail: 'ağ güvenliği temel bilgisi gerekli' },
      { title: 'Grafik Tasarım Stajyeri', detail: 'Figma ve Adobe Creative Suite' },
      { title: 'UX/UI Tasarım Stajyeri', detail: 'kullanıcı araştırması ve prototipleme' },
      { title: 'Muhasebe Stajyeri', detail: 'muhasebe yazılımı deneyimi artı' },
      { title: 'Finans Stajyeri', detail: 'Excel ve finansal analiz temeli' },
      { title: 'Pazarlama Stajyeri', detail: 'sosyal medya ve içerik üretimi' },
      { title: 'İnsan Kaynakları Stajyeri', detail: 'iletişim becerileri ön planda' },
      { title: 'Hukuk Stajyeri (Avukatlık Bürosu)', detail: 'şirketler veya ticaret hukuku odaklı' },
      { title: 'Muhabirlik Stajyeri', detail: 'yazarlık becerisi ve haber takibi' },
      { title: 'Video İçerik Üretici Stajyer', detail: 'Premiere Pro veya DaVinci Resolve' },
      { title: 'Sosyal Medya Stajyeri', detail: 'içerik takvimi ve analitik takip' },
      { title: 'E-Ticaret Stajyeri', detail: 'Amazon/Trendyol paneli deneyimi artı' },
      { title: 'İş Geliştirme Stajyeri', detail: 'araştırma ve sunum becerisi' },
      { title: 'Çevirmen Stajyer (EN-TR)', detail: 'C1 İngilizce seviyesi gerekli' },
    ],
    durations: ['3 aylık', '6 aylık', '4 aylık', '2 aylık'],
    modes: ['uzaktan', 'hibrit (haftada 2 gün ofis)', 'tam zamanlı ofis', 'yarı zamanlı uzaktan'],
    desc_templates: [
      '{role_title} arıyoruz. {role_detail}. {duration}, {mode}. Başvuru için CV gönderin.',
      'Ekibimize {role_title} alıyoruz. {role_detail}. Süre: {duration}, çalışma: {mode}.',
      '{duration} {role_title} pozisyonu açık. {role_detail}. Staj sonrası iş fırsatı değerlendirilebilir.',
      '{role_title} için stajyer arıyoruz. {mode} çalışma, {duration}. {role_detail}.',
    ],
    contact_pool: [
      'hr@teknofirma.com','staj@ajans.com.tr','kariyer@sirket.com.tr',
      'insan.kaynaklari@istanbularel.edu.tr','staj@hukukburo.av.tr','05501234567',
    ],
  },

  'kayip-bulundu': {
    faculty: ['diger'],
    lost: [
      { item: 'Mavi metal kalem', where: 'A Blok koridoru', detail: 'üzerinde isim kazıma var' },
      { item: 'Siyah sırt çantası', where: 'kütüphane 2. kat', detail: 'içinde ders kitapları ve laptop var' },
      { item: 'AirPods Pro kutusu', where: 'kantin', detail: 'sağ kulaklık eksik' },
      { item: 'Öğrenci kimliği', where: 'otopark girişi', detail: 'fotoğraflı mavi kart' },
      { item: 'Anahtarlık (araba anahtarı dahil)', where: 'spor salonu', detail: 'kırmızı taşlı anahtarlık' },
      { item: 'Gözlük (siyah çerçeve)', where: 'derslik B-204', detail: 'miyop gözlük, kılıfı da var' },
      { item: 'Şemsiye (lacivert)', where: 'ana giriş', detail: 'üzerinde büyük harf H var' },
      { item: 'Hesap makinesi', where: 'sınav salonu', detail: 'Casio marka, üzerine isim yazılı' },
      { item: 'Tablet (Samsung)', where: 'kütüphane', detail: 'siyah kılıflı, kırık ekran yok' },
      { item: 'Bozuk para cüzdanı', where: 'kafeterya', detail: 'içinde öğrenci kartı var' },
      { item: 'Spor çantası (Nike)', where: 'soyunma odası', detail: 'kırmızı-beyaz, kilit takılı' },
      { item: 'Ders notu dosyası', where: 'C Blok merdiveni', detail: 'yeşil plastik dosya, Calculus notları' },
    ],
    found: [
      { item: 'Siyah laptop çantası', where: 'kütüphane', detail: 'güvenliğe teslim edildi' },
      { item: 'Öğrenci kimliği', where: 'kantin masası', detail: 'sekreterliğe bırakıldı' },
      { item: 'Telefon (ekran kırık)', where: 'B Blok WC', detail: 'kapıcı odasında bekliyor' },
      { item: 'Bayan cüzdanı', where: 'otopark', detail: 'içindekiler eksiksiz, güvenlikte' },
      { item: 'Sarı şemsiye', where: 'ana giriş merdiveni', detail: 'kapıda asılı bekliyor' },
      { item: 'Kulaklık (beyaz)', where: 'kütüphane 3. kat', detail: 'masada bırakılmıştı, alındı' },
    ],
    desc_templates: {
      lost: 'KAYIP: {item} kaybettim. Yer: {where}. {detail}. Bulan lütfen iletişime geçsin, ödül vereceğim.',
      found: 'BULUNDU: {item} bulundu. Yer: {where}. {detail}. Sahibi iletişime geçebilir.',
    },
    contact_pool: [
      '05551239876','05339876512','kayip@istanbularel.edu.tr',
      'guvenlik@istanbularel.edu.tr','05441231234',
    ],
  },

  'genel': {
    faculty: ['muhendislik','iktisat','hukuk','fen-edebiyat','iletisim','egitim','guzel-sanatlar','diger'],
    topics: [
      { title: 'Ders çalışma grubu kuruluyor', detail: 'haftalık düzenli toplantılar, motivasyon ortamı' },
      { title: 'Yurt arkadaşı aranıyor', detail: 'Bahçelievler bölgesi, temiz ve sakin ev' },
      { title: 'Okul servisi oluşturuyoruz', detail: 'Kadıköy hattı, maliyet bölüşümü' },
      { title: 'İkinci el kitap takası', detail: 'tüm bölümler katılabilir, WhatsApp grubu' },
      { title: 'Kampüs bisiklet paylaşımı', detail: 'günlük kiralama sistemi, uygun fiyat' },
      { title: 'Özel ders verilebilir', detail: 'saate göre ücretlendirme, esnek saatler' },
      { title: 'Proje ortağı aranıyor', detail: 'senior proje için ekip kuruyorum' },
      { title: 'Staj deneyimleri paylaşım grubu', detail: 'CV ve mülakat tavsiyeleri' },
      { title: 'Tercüme yardımı', detail: 'İngilizce-Türkçe, akademik metin' },
      { title: 'Fotoğraf çekimi (öğrenci fiyatına)', detail: 'LinkedIn ve mezuniyet fotoğrafı' },
      { title: 'Logo tasarımı yapılır', detail: 'öğrenci kulüpleri için uygun fiyat' },
      { title: 'Bölüm dışı ders rehberi', detail: 'hangi dersler alınabilir, nasıl kayıt olunur' },
      { title: 'Yemekhane menü paylaşım grubu', detail: 'haftalık menü önceden paylaşılıyor' },
      { title: 'Matematik özel dersi', detail: 'Calculus, Lineer Cebir, istatistik' },
      { title: 'İngilizce konuşma pratiği', detail: 'language exchange, haftada 1 buluşma' },
      { title: 'Kod yazımında yardım', detail: 'Python, JavaScript, C++, ücretli' },
      { title: 'Anket doldurma yardımı', detail: 'tez için veri toplama, 5 dakika' },
      { title: 'Kitap tavsiye listesi', detail: 'bölümlere göre okunması gereken kitaplar' },
      { title: 'Kampüs WiFi sorunları hakkında', detail: 'çözüm yolları ve alternatifler' },
      { title: 'Mezuniyet törenine yer tutma', detail: 'aileler için oturma düzeni' },
    ],
    desc_templates: [
      '{detail}. İlgilenenler iletişime geçebilir.',
      '{detail}. Detaylar için mesaj atın.',
      'Bu konuda {detail}. Katılmak isteyenler yazabilir.',
      '{detail}. Ciddiye alınanlar için uygun.',
    ],
    contact_pool: [
      '05389998877','05441230099','05551122334','genel@istanbularel.edu.tr',
      '05327778899','05469990011',
    ],
  },
};

// ── Generator ──────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateListing(category) {
  const c = COMPONENTS[category];
  const faculty  = pick(c.faculty);
  const contact  = pick(c.contact_pool);

  if (category === 'ders-notu') {
    const subject = pick(c.subjects);
    const format  = pick(c.formats);
    const tmpl    = pick(c.desc_templates);
    return {
      title:       `${subject} — ${format}`,
      description: tmpl.replace('{subject}', subject).replace('{format}', format),
      category, faculty, contact,
    };
  }

  if (category === 'ikinci-el') {
    const item  = pick(c.items);
    const tmpl  = pick(c.desc_templates);
    return {
      title:       `${item.name} — Satılık`,
      description: tmpl
        .replace('{item_name}', item.name)
        .replace('{item_detail}', item.detail)
        .replace('{price}', item.price),
      category, faculty, contact,
    };
  }

  if (category === 'etkinlik') {
    const event = pick(c.events);
    const fee   = pick(c.fees);
    const tmpl  = pick(c.desc_templates);
    return {
      title:       event.name,
      description: tmpl
        .replace('{event_name}', event.name)
        .replace('{event_detail}', event.detail)
        .replace('{fee}', fee),
      category, faculty, contact,
    };
  }

  if (category === 'staj') {
    const role     = pick(c.roles);
    const duration = pick(c.durations);
    const mode     = pick(c.modes);
    const tmpl     = pick(c.desc_templates);
    return {
      title:       role.title,
      description: tmpl
        .replace(/{role_title}/g, role.title)
        .replace('{role_detail}', role.detail)
        .replace('{duration}', duration)
        .replace('{mode}', mode),
      category, faculty, contact,
    };
  }

  if (category === 'kayip-bulundu') {
    const isLost = Math.random() > 0.4;
    const pool   = isLost ? c.lost : c.found;
    const item   = pick(pool);
    const tmpl   = isLost ? c.desc_templates.lost : c.desc_templates.found;
    return {
      title:       isLost ? `KAYIP: ${item.item}` : `BULUNDU: ${item.item}`,
      description: tmpl
        .replace('{item}', item.item)
        .replace('{where}', item.where)
        .replace('{detail}', item.detail),
      category, faculty, contact,
    };
  }

  if (category === 'genel') {
    const topic = pick(c.topics);
    const tmpl  = pick(c.desc_templates);
    return {
      title:       topic.title,
      description: tmpl.replace('{detail}', topic.detail),
      category, faculty, contact,
    };
  }
}

// ── Ana fonksiyon ──────────────────────────────────────────────────────────────

const ALL_CATEGORIES = ['ders-notu','ikinci-el','etkinlik','staj','kayip-bulundu','genel'];

function randomPastDate(maxDaysAgo = 60) {
  const ms = Date.now() - Math.random() * maxDaysAgo * 86_400_000;
  return new Date(ms).toISOString();
}

function randomFutureDate(minDays = 7, maxDays = 60) {
  const ms = Date.now() + (minDays + Math.random() * (maxDays - minDays)) * 86_400_000;
  return new Date(ms).toISOString();
}

async function run() {
  const db = await createDb();

  const users = await db.all(
    `SELECT id FROM users WHERE university_slug = 'istanbul-arel-university'`
  );
  if (users.length === 0) { console.log('Kullanıcı yok.'); return; }

  const count = 3 + Math.floor(Math.random() * 3); // 3-5

  let added = 0;
  for (let i = 0; i < count; i++) {
    const category   = pick(ALL_CATEGORIES);
    const listing    = generateListing(category);
    const userId     = pick(users).id;
    const createdAt  = randomPastDate(60);
    const expiresAt  = Math.random() > 0.5 ? randomFutureDate(7, 60) : null;
    await db.run(
      `INSERT INTO listings
         (user_id, title, description, category, faculty, university_slug,
          contact, status, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'istanbul-arel-university', ?, 'aktif', ?, ?, ?)`,
      [userId, listing.title, listing.description, listing.category, listing.faculty,
       listing.contact, expiresAt, createdAt, createdAt]
    );
    added++;
    console.log(`  ✅ [${category.padEnd(14)}] ${listing.title.slice(0, 55)}`);
  }

  console.log(`\n🌱 ${added} ilan eklendi — ${new Date().toLocaleDateString('tr-TR')}`);
}

run().catch(err => {
  console.error('❌ Seed hatası:', err.message);
  process.exit(1);
});
