class AdminController {
  constructor(adminService) {
    this.adminService = adminService;
  }

  async getStats(req, res) {
    try {
      const stats = await this.adminService.getStats();
      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async getUsers(req, res) {
    try {
      const { search = '', page = 1, limit = 30 } = req.query;
      const result = await this.adminService.getUsers({ search, page: Number(page), limit: Number(limit) });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async banUser(req, res) {
    try {
      const result = await this.adminService.banUser(req.user.id, req.params.id);
      res.json(result);
    } catch (e) {
      if (e.type === 'not_found') return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      if (e.type === 'forbidden') return res.status(403).json({ error: e.message });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async unbanUser(req, res) {
    try {
      const result = await this.adminService.unbanUser(req.params.id);
      res.json(result);
    } catch (e) {
      if (e.type === 'not_found') return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async deleteUser(req, res) {
    try {
      const result = await this.adminService.deleteUser(req.user.id, req.params.id);
      res.json(result);
    } catch (e) {
      if (e.type === 'not_found') return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      if (e.type === 'forbidden') return res.status(403).json({ error: e.message });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async getListings(req, res) {
    try {
      const { search = '', category = '', status = '', author = '', page = 1, limit = 30 } = req.query;
      const result = await this.adminService.getListings({ search, category, status, author, page: Number(page), limit: Number(limit) });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async deleteListing(req, res) {
    try {
      const result = await this.adminService.deleteListing(req.params.id);
      res.json(result);
    } catch (e) {
      if (e.type === 'not_found') return res.status(404).json({ error: 'İlan bulunamadı' });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async getComments(req, res) {
    try {
      const { search = '', page = 1, limit = 30 } = req.query;
      const result = await this.adminService.getComments({ search, page: Number(page), limit: Number(limit) });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async deleteComment(req, res) {
    try {
      const result = await this.adminService.deleteComment(req.params.id);
      res.json(result);
    } catch (e) {
      if (e.type === 'not_found') return res.status(404).json({ error: 'Yorum bulunamadı' });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
}

module.exports = { AdminController };
