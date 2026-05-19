const { AuthService } = require('../src/services/authService');
const { createDb }    = require('../src/db');

function makeDb() { return createDb(':memory:'); }

const validUser = { name: 'Test Kullanıcı', email: 'test@uni.edu', password: 'sifre123' };

describe('AuthService — validateRegister', () => {
  let service;
  beforeEach(() => { service = new AuthService(makeDb()); });

  test('geçerli veriyle hata dönmemeli', () => {
    expect(service.validateRegister(validUser)).toHaveLength(0);
  });
  test('kısa isimde hata vermeli', () => {
    expect(service.validateRegister({ ...validUser, name: 'A' }))
      .toContain('İsim en az 2 karakter olmalıdır');
  });
  test('geçersiz e-postada hata vermeli', () => {
    expect(service.validateRegister({ ...validUser, email: 'gecersiz' }))
      .toContain('Geçerli bir e-posta adresi giriniz');
  });
  test('kısa şifrede hata vermeli', () => {
    expect(service.validateRegister({ ...validUser, password: '123' }))
      .toContain('Şifre en az 6 karakter olmalıdır');
  });
});

describe('AuthService — register', () => {
  let service;
  beforeEach(() => { service = new AuthService(makeDb()); });

  test('kayıt başarıyla tamamlanmalı', () => {
    const result = service.register(validUser);
    expect(result.user.email).toBe(validUser.email);
    expect(result.user.name).toBe(validUser.name);
    expect(result.token).toBeDefined();
    expect(result.user.password).toBeUndefined();
  });

  test('e-posta küçük harfe dönüştürülmeli', () => {
    const result = service.register({ ...validUser, email: 'TEST@UNI.EDU' });
    expect(result.user.email).toBe('test@uni.edu');
  });

  test('aynı e-posta ile ikinci kayıt hata atmalı', () => {
    service.register(validUser);
    expect(() => service.register(validUser)).toThrow();
  });

  test('geçersiz veriyle kayıt hata atmalı', () => {
    expect(() => service.register({ ...validUser, name: 'A' })).toThrow();
  });
});

describe('AuthService — login', () => {
  let service;
  beforeEach(() => {
    service = new AuthService(makeDb());
    service.register(validUser);
  });

  test('doğru kimlik bilgileriyle giriş başarılı olmalı', () => {
    const result = service.login({ email: validUser.email, password: validUser.password });
    expect(result.user.email).toBe(validUser.email);
    expect(result.token).toBeDefined();
  });

  test('yanlış şifreyle giriş hata atmalı', () => {
    expect(() => service.login({ email: validUser.email, password: 'yanlis' })).toThrow();
  });

  test('kayıtsız e-postayla giriş hata atmalı', () => {
    expect(() => service.login({ email: 'yok@uni.edu', password: 'sifre123' })).toThrow();
  });

  test('şifresiz istekte hata atmalı', () => {
    expect(() => service.login({ email: validUser.email })).toThrow();
  });

  test('dönen token doğrulanabilmeli', () => {
    const { token } = service.login({ email: validUser.email, password: validUser.password });
    const payload = service.verify(token);
    expect(payload.email).toBe(validUser.email);
  });
});

describe('AuthService — getProfile & updateProfile', () => {
  let service, userId;
  beforeEach(() => {
    service = new AuthService(makeDb());
    const result = service.register(validUser);
    userId = result.user.id;
  });

  test('profil getirilebilmeli', () => {
    const profile = service.getProfile(userId);
    expect(profile.email).toBe(validUser.email);
    expect(profile.password).toBeUndefined();
  });

  test('olmayan kullanıcı için getProfile hata atmalı', () => {
    expect(() => service.getProfile(9999)).toThrow();
  });

  test('profil güncellenebilmeli', () => {
    const updated = service.updateProfile(userId, { name: 'Yeni İsim', department: 'Bilgisayar Mühendisliği' });
    expect(updated.name).toBe('Yeni İsim');
    expect(updated.department).toBe('Bilgisayar Mühendisliği');
  });

  test('kısa isimle güncelleme hata atmalı', () => {
    expect(() => service.updateProfile(userId, { name: 'A' })).toThrow();
  });

  test('geçersiz telefon numarasıyla güncelleme hata atmalı', () => {
    expect(() => service.updateProfile(userId, { phone: 'abc' })).toThrow();
  });
});
