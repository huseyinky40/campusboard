const { AuthService } = require('../src/services/authService');
const { createDb }    = require('../src/db');

async function makeDb() { return createDb(':memory:'); }

const validUser = { name: 'Test Kullanıcı', email: 'test@uni.edu', password: 'sifre123' };

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
    const result = await service.register({ ...validUser, email: 'TEST@UNI.EDU' });
    expect(result.user.email).toBe('test@uni.edu');
  });

  test('aynı e-posta ile ikinci kayıt hata atmalı', async () => {
    await service.register(validUser);
    await expect(service.register(validUser)).rejects.toBeTruthy();
  });

  test('geçersiz veriyle kayıt hata atmalı', async () => {
    await expect(service.register({ ...validUser, name: 'A' })).rejects.toBeTruthy();
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
    await expect(service.login({ email: 'yok@uni.edu', password: 'sifre123' })).rejects.toBeTruthy();
  });

  test('şifresiz istekte hata atmalı', async () => {
    await expect(service.login({ email: validUser.email })).rejects.toBeTruthy();
  });

  test('dönen token doğrulanabilmeli', async () => {
    const { token } = await service.login({ email: validUser.email, password: validUser.password });
    const payload = service.verify(token);
    expect(payload.email).toBe(validUser.email);
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
