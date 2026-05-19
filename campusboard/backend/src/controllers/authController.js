class AuthController {
  constructor(authService) {
    this.service = authService;
  }

  register(req, res) {
    try {
      const result = this.service.register(req.body);
      res.status(201).json({ ...result, message: 'Kayıt başarılı' });
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  login(req, res) {
    try {
      const result = this.service.login(req.body);
      res.json({ ...result, message: 'Giriş başarılı' });
    } catch (err) {
      if (err.type === 'validation' || err.type === 'auth')
        return res.status(401).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  me(req, res) {
    res.json({ data: req.user });
  }

  getProfile(req, res) {
    try {
      const profile = this.service.getProfile(req.user.id);
      res.json({ data: profile });
    } catch (err) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
  }

  updateProfile(req, res) {
    try {
      const updated = this.service.updateProfile(req.user.id, req.body);
      res.json({ data: updated, message: 'Profil güncellendi' });
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
}

module.exports = { AuthController };
