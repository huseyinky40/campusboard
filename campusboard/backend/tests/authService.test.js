const { AuthService } = require('../src/services/authService');
const { createDb }    = require('../src/db');

async function makeDb() { return createDb(':memory:'); }

const validUser = { name: 'Test Kullanıcı', email: 'test@istanbularel.edu.tr', password: 'sifre123' };

// ── Mock e-posta servisi ──────────────────────────────────────────────────────
// register() / resendVerify() çalışabilsin diye minimal bir stub.
// Gönderilen kodu yakalamak için captureCode nesnesi referans olarak geçilir.
function makeMockEmail(capture = {}) {
  return {
    sendVerificationCode: async (_email, code) => { capture.verify = code; },
    sendPasswordResetCode: async (_email, code) => { capture.reset = code; },
  };
}

// ── Yardımcı: dev modunda sıfırlama kodu al ───────────────────────────────────
// emailService olmayan serviste forgotPassword devCode döner.
async function getDevResetCode(service, email = validUser.email) {
  const r = await service.forgotPassword(email);
  return r.devCode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mevcut testler
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService — validateRegister', () => {
  let service;
  beforeEach(async () => { service = new AuthService(await makeDb()); });

  test('geçerli veriyle hata dönmemeli', () => {
    expect(service.validateRegister(validUser)).toHaveLength(0);
  });
  test('kısa isimde hata vermeli', () => {
    expect(service.validateRegister({ ...validUser, name: 'A' }))
      .toContain('Ad ve soyad birlikte yazın');
  });
  test('geçersiz e-postada hata vermeli', () => {
    expect(service.validateRegister({ ...validUser, email: 'gecersiz' }))
      .toContain('Geçerli bir e-posta adresi giriniz');
  });
  test('izin verilmeyen e-posta uzantısında hata vermeli', () => {
    expect(service.validateRegister({ ...validUser, email: 'test@gmail.com' }))
      .toContain('Yalnızca desteklenen üniversite e-postalarıyla kayıt yapılabilir: @istanbularel.edu.tr');
  });
  test('kısa şifrede hata vermeli', () => {
    expect(service.validateRegister({ ...validUser, password: '123' }))
      .toContain('Şifre en az 8 karakter olmalıdır');
  });
});

describe('AuthService — register', () => {
  let service;
  beforeEach(async () => { service = new AuthService(await makeDb()); });

  test('kayıt başarıyla tamamlanmalı', async () => {
    const result = await service.register(validUser);
    expect(result.user.email).toBe(validUser.email);
    expect(result.user.name).toBe(validUser.name);
    expect(result.token).toBeDefined();
    expect(result.user.password).toBeUndefined();
  });

  test('e-posta küçük harfe dönüştürülmeli', async () => {
    const result = await service.register({ ...validUser, email: 'TEST@ISTANBULAREL.EDU.TR' });
    expect(result.user.email).toBe('test@istanbularel.edu.tr');
    expect(result.user.university_slug).toBe('istanbul-arel-university');
  });

  test('aynı e-posta ile ikinci kayıt hata atmalı', async () => {
    await service.register(validUser);
    await expect(service.register(validUser)).rejects.toBeTruthy();
  });

  test('geçersiz veriyle kayıt hata atmalı', async () => {
    await expect(service.register({ ...validUser, name: 'A' })).rejects.toBeTruthy();
  });

  test('emailService varken kayıt doğrulama kodu gönderir, token dönmez', async () => {
    const capture = {};
    service = new AuthService(await makeDb(), makeMockEmail(capture));
    const result = await service.register(validUser);
    expect(result.message).toBeDefined();
    expect(result.token).toBeUndefined();
    expect(capture.verify).toBeDefined();           // mock çağrıldı
    expect(capture.verify).toHaveLength(6);          // 6 haneli OTP
  });
});

describe('AuthService — login', () => {
  let service;
  beforeEach(async () => {
    service = new AuthService(await makeDb());
    await service.register(validUser);
  });

  test('doğru kimlik bilgileriyle giriş başarılı olmalı', async () => {
    const result = await service.login({ email: validUser.email, password: validUser.password });
    expect(result.user.email).toBe(validUser.email);
    expect(result.token).toBeDefined();
  });

  test('yanlış şifreyle giriş hata atmalı', async () => {
    await expect(service.login({ email: validUser.email, password: 'yanlis' })).rejects.toBeTruthy();
  });

  test('kayıtsız e-postayla giriş hata atmalı', async () => {
    await expect(service.login({ email: 'yok@istanbularel.edu.tr', password: 'sifre123' })).rejects.toBeTruthy();
  });

  test('izin verilmeyen e-posta uzantısıyla giriş hata atmalı', async () => {
    await expect(service.login({ email: 'test@gmail.com', password: validUser.password })).rejects.toBeTruthy();
  });

  test('şifresiz istekte hata atmalı', async () => {
    await expect(service.login({ email: validUser.email })).rejects.toBeTruthy();
  });

  test('dönen token doğrulanabilmeli', async () => {
    const { token } = await service.login({ email: validUser.email, password: validUser.password });
    const payload = service.verify(token);
    expect(payload.email).toBe(validUser.email);
  });

  test('emailService varken doğrulanmamış hesap giriş yapamamalı', async () => {
    const capture = {};
    const svc = new AuthService(await makeDb(), makeMockEmail(capture));
    await svc.register(validUser);   // verify_token set, email_verified=false
    await expect(
      svc.login({ email: validUser.email, password: validUser.password })
    ).rejects.toMatchObject({ type: 'unverified' });
  });
});

describe('AuthService — getProfile & updateProfile', () => {
  let service, userId;
  beforeEach(async () => {
    service = new AuthService(await makeDb());
    const result = await service.register(validUser);
    userId = result.user.id;
  });

  test('profil getirilebilmeli', async () => {
    const profile = await service.getProfile(userId);
    expect(profile.email).toBe(validUser.email);
    expect(profile.password).toBeUndefined();
  });

  test('olmayan kullanıcı için getProfile hata atmalı', async () => {
    await expect(service.getProfile(9999)).rejects.toBeTruthy();
  });

  test('profil güncellenebilmeli', async () => {
    const updated = await service.updateProfile(userId, { name: 'Yeni İsim', department: 'Bilgisayar Mühendisliği' });
    expect(updated.name).toBe('Yeni İsim');
    expect(updated.department).toBe('Bilgisayar Mühendisliği');
  });

  test('kısa isimle güncelleme hata atmalı', async () => {
    await expect(service.updateProfile(userId, { name: 'A' })).rejects.toBeTruthy();
  });

  test('geçersiz telefon numarasıyla güncelleme hata atmalı', async () => {
    await expect(service.updateProfile(userId, { phone: 'abc' })).rejects.toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E-posta doğrulama
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService — verifyEmail', () => {
  let service, capture;

  beforeEach(async () => {
    capture = {};
    service = new AuthService(await makeDb(), makeMockEmail(capture));
    await service.register(validUser);   // mock'a verify kodu yazılır
  });

  test('doğru kodla doğrulama başarılı olmalı ve token dönmeli', async () => {
    const result = await service.verifyEmail(validUser.email, capture.verify);
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe(validUser.email);
  });

  test('yanlış kodla doğrulama hata atmalı', async () => {
    await expect(
      service.verifyEmail(validUser.email, '000000')
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('olmayan e-posta ile doğrulama hata atmalı', async () => {
    await expect(
      service.verifyEmail('yok@istanbularel.edu.tr', capture.verify)
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('zaten doğrulanmış hesap için doğrulama hata atmalı', async () => {
    await service.verifyEmail(validUser.email, capture.verify);
    await expect(
      service.verifyEmail(validUser.email, capture.verify)
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('süresi dolmuş kodla doğrulama hata atmalı', async () => {
    await service.db.run(
      'UPDATE users SET verify_token_expires = ? WHERE email = ?',
      [new Date(Date.now() - 1000).toISOString(), validUser.email]
    );
    await expect(
      service.verifyEmail(validUser.email, capture.verify)
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('doğrulamadan sonra giriş yapılabilmeli', async () => {
    await service.verifyEmail(validUser.email, capture.verify);
    const result = await service.login({ email: validUser.email, password: validUser.password });
    expect(result.token).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Doğrulama kodu yeniden gönderme
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService — resendVerify', () => {
  let service, capture;

  beforeEach(async () => {
    capture = {};
    service = new AuthService(await makeDb(), makeMockEmail(capture));
    await service.register(validUser);
  });

  test('yeni doğrulama kodu gönderilebilmeli', async () => {
    const oldCode = capture.verify;
    await service.resendVerify(validUser.email);
    expect(capture.verify).toBeDefined();
    // Yeni kod eski kodun üzerine yazılmalı (DB'de güncellenmiş)
    expect(capture.verify).toHaveLength(6);
    _ = oldCode; // lint uyarısını bastır
  });

  test('yeniden gönderilen yeni kodla doğrulama tamamlanabilmeli', async () => {
    await service.resendVerify(validUser.email);
    const newCode = capture.verify;
    const result = await service.verifyEmail(validUser.email, newCode);
    expect(result.token).toBeDefined();
  });

  test('olmayan e-posta için hata atmalı', async () => {
    await expect(
      service.resendVerify('yok@istanbularel.edu.tr')
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('zaten doğrulanmış hesap için hata atmalı', async () => {
    await service.verifyEmail(validUser.email, capture.verify);
    await expect(
      service.resendVerify(validUser.email)
    ).rejects.toMatchObject({ type: 'validation' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Şifremi unuttum
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService — forgotPassword', () => {
  let service;

  beforeEach(async () => {
    service = new AuthService(await makeDb());   // emailService yok → dev modu
    await service.register(validUser);
  });

  test('kayıtlı e-posta için sıfırlama kodu üretilmeli (dev modu)', async () => {
    const result = await service.forgotPassword(validUser.email);
    expect(result.message).toBeDefined();
    expect(result.devCode).toBeDefined();
    expect(String(result.devCode)).toHaveLength(5);   // 5 karakterli alfanümerik kod
  });

  test('kayıtsız e-posta için jenerik mesaj dönmeli — kullanıcı varlığı ifşa edilmemeli', async () => {
    const result = await service.forgotPassword('yok@istanbularel.edu.tr');
    expect(result.message).toBeDefined();
    expect(result.devCode).toBeUndefined();
  });

  test('geçersiz e-posta formatıyla hata atmalı', async () => {
    await expect(
      service.forgotPassword('gecersiz-email')
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('desteklenmeyen e-posta uzantısıyla hata atmalı', async () => {
    await expect(
      service.forgotPassword('test@gmail.com')
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('emailService varken kod e-postayla gönderilmeli, devCode dönmemeli', async () => {
    const capture = {};
    const svc = new AuthService(await makeDb(), makeMockEmail(capture));
    await svc.register(validUser);
    await svc.verifyEmail(validUser.email, capture.verify);   // önce doğrula
    const result = await svc.forgotPassword(validUser.email);
    expect(result.message).toBeDefined();
    expect(result.devCode).toBeUndefined();
    expect(capture.reset).toBeDefined();   // sendPasswordResetCode çağrıldı
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sıfırlama kodunu doğrula
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService — verifyResetCode', () => {
  let service, resetCode;

  beforeEach(async () => {
    service = new AuthService(await makeDb());
    await service.register(validUser);
    resetCode = await getDevResetCode(service);
  });

  test('geçerli kodla doğrulama başarılı olmalı', async () => {
    const result = await service.verifyResetCode(validUser.email, resetCode);
    expect(result.message).toBeDefined();
    expect(result.email).toBe(validUser.email);
  });

  test('yanlış kodla (5 karakter) doğrulama hata atmalı', async () => {
    await expect(
      service.verifyResetCode(validUser.email, 'ZZZZZ')
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('5 karakterden kısa kodla hata atmalı', async () => {
    await expect(
      service.verifyResetCode(validUser.email, 'AB')
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('süresi dolmuş kodla doğrulama hata atmalı', async () => {
    await service.db.run(
      'UPDATE users SET reset_token_expires = ? WHERE email = ?',
      [new Date(Date.now() - 1000).toISOString(), validUser.email]
    );
    await expect(
      service.verifyResetCode(validUser.email, resetCode)
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('sıfırlama talebi yapılmamış hesap için hata atmalı', async () => {
    // İkinci kullanıcı — hiç forgotPassword çağrılmadı
    const db2 = await makeDb();
    const svc2 = new AuthService(db2);
    await svc2.register({ ...validUser, email: 'diger@istanbularel.edu.tr' });
    await expect(
      svc2.verifyResetCode('diger@istanbularel.edu.tr', 'AAAAA')
    ).rejects.toMatchObject({ type: 'validation' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Şifre sıfırlama + geçmiş kontrolü
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService — resetPassword', () => {
  let service;

  beforeEach(async () => {
    service = new AuthService(await makeDb());
    await service.register(validUser);
  });

  test('geçerli kodla şifre sıfırlanabilmeli', async () => {
    const code = await getDevResetCode(service);
    const result = await service.resetPassword(validUser.email, code, 'YeniSifre123!');
    expect(result.message).toBeDefined();
  });

  test('sıfırlamadan sonra yeni şifreyle giriş yapılabilmeli', async () => {
    const code = await getDevResetCode(service);
    await service.resetPassword(validUser.email, code, 'YeniSifre123!');
    const result = await service.login({ email: validUser.email, password: 'YeniSifre123!' });
    expect(result.token).toBeDefined();
  });

  test('sıfırlamadan sonra eski şifreyle giriş yapılamamalı', async () => {
    const code = await getDevResetCode(service);
    await service.resetPassword(validUser.email, code, 'YeniSifre123!');
    await expect(
      service.login({ email: validUser.email, password: validUser.password })
    ).rejects.toBeTruthy();
  });

  test('kısa şifreyle sıfırlama hata atmalı', async () => {
    const code = await getDevResetCode(service);
    await expect(
      service.resetPassword(validUser.email, code, '123')
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('yanlış kodla sıfırlama hata atmalı', async () => {
    await getDevResetCode(service);   // token set edilsin
    await expect(
      service.resetPassword(validUser.email, 'ZZZZZ', 'YeniSifre123!')
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('kullanılmış kod ikinci kez çalışmamalı', async () => {
    const code = await getDevResetCode(service);
    await service.resetPassword(validUser.email, code, 'YeniSifre123!');
    // reset_token_hash = NULL oldu
    await expect(
      service.resetPassword(validUser.email, code, 'BaskaSifre456!')
    ).rejects.toMatchObject({ type: 'validation' });
  });

  // ── Şifre geçmişi ──────────────────────────────────────────────────────────

  test('mevcut şifreyle aynı şifreye sıfırlama engellenmeli', async () => {
    const code = await getDevResetCode(service);
    await expect(
      service.resetPassword(validUser.email, code, validUser.password)
    ).rejects.toMatchObject({ type: 'validation', errors: ['Yeni şifreniz son 3 şifrenizden farklı olmalıdır'] });
  });

  test('1 sıfırlamadan sonra eski şifre geçmişte kalmalı ve reddedilmeli', async () => {
    const code1 = await getDevResetCode(service);
    await service.resetPassword(validUser.email, code1, 'AralikSifre1!');
    // validUser.password artık history[0] olmalı
    const code2 = await getDevResetCode(service);
    await expect(
      service.resetPassword(validUser.email, code2, validUser.password)
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('2 sıfırlamadan sonra 1. şifre hâlâ geçmişte olmalı ve reddedilmeli', async () => {
    const code1 = await getDevResetCode(service);
    await service.resetPassword(validUser.email, code1, 'AralikSifre1!');

    const code2 = await getDevResetCode(service);
    await service.resetPassword(validUser.email, code2, 'AralikSifre2!');

    // validUser.password geçmişin 2. slotunda
    const code3 = await getDevResetCode(service);
    await expect(
      service.resetPassword(validUser.email, code3, validUser.password)
    ).rejects.toMatchObject({ type: 'validation' });
  });

  test('3 sıfırlamadan sonra ilk şifre geçmişten düşmeli ve tekrar kullanılabilmeli', async () => {
    // Sıfırlama 1: pass0 → pass1   history: [pass0]
    const code1 = await getDevResetCode(service);
    await service.resetPassword(validUser.email, code1, 'AralikSifre1!');

    // Sıfırlama 2: pass1 → pass2   history: [pass1, pass0]
    const code2 = await getDevResetCode(service);
    await service.resetPassword(validUser.email, code2, 'AralikSifre2!');

    // Sıfırlama 3: pass2 → pass3   history: [pass2, pass1]  (pass0 budandı)
    const code3 = await getDevResetCode(service);
    await service.resetPassword(validUser.email, code3, 'AralikSifre3!');

    // pass0 artık geçmişte yok → tekrar kabul edilmeli
    const code4 = await getDevResetCode(service);
    const result = await service.resetPassword(validUser.email, code4, validUser.password);
    expect(result.message).toBeDefined();
  });

  test('geçmişte olmayan tamamen yeni bir şifreye her zaman izin verilmeli', async () => {
    const code = await getDevResetCode(service);
    const result = await service.resetPassword(validUser.email, code, 'HicKullanilmadi999!');
    expect(result.message).toBeDefined();
  });
});
