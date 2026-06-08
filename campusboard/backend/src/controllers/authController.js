class AuthController {
  constructor(authService) {
    this.service = authService;
  }

  universities(req, res) {
    res.json({ data: this.service.getSupportedUniversities() });
  }

  async register(req, res) {
    try {
      const result = await this.service.register(req.body);
      res.status(201).json({ ...result, message: 'Kayıt başarılı' });
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async login(req, res) {
    try {
      const result = await this.service.login(req.body);
      res.json({ ...result, message: 'Giriş başarılı' });
    } catch (err) {
      if (err.type === 'validation' || err.type === 'auth')
        return res.status(401).json({ errors: err.errors });
      if (err.type === 'banned')
        return res.status(403).json({ type: 'banned', error: 'Hesabınız askıya alınmıştır' });
      if (err.type === 'unverified')
        return res.status(403).json({ type: 'unverified', errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async verifyEmail(req, res) {
    try {
      const result = await this.service.verifyEmail(req.body.email, req.body.code);
      res.json({ ...result, message: 'E-posta doğrulandı' });
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async resendVerify(req, res) {
    try {
      const result = await this.service.resendVerify(req.body.email);
      res.json(result);
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async forgotPassword(req, res) {
    try {
      const result = await this.service.forgotPassword(req.body.email);
      res.json(result);
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async verifyResetCode(req, res) {
    try {
      const result = await this.service.verifyResetCode(req.body.email, req.body.code);
      res.json(result);
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async resetPassword(req, res) {
    try {
      const result = await this.service.resetPassword(req.body.email, req.body.code, req.body.password);
      res.json(result);
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  me(req, res) {
    res.json({ data: req.user });
  }

  async getProfile(req, res) {
    try {
      const profile = await this.service.getProfile(req.user.id);
      res.json({ data: profile });
    } catch (err) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
  }

  async updateProfile(req, res) {
    try {
      const updated = await this.service.updateProfile(req.user.id, req.body);
      res.json({ data: updated, message: 'Profil güncellendi' });
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
}

module.exports = { AuthController };
