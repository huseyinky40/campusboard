class AdminController {
  constructor(adminService) {
    this.adminService = adminService;
  }

  async getStats(req, res) {
    try {
      res.json(await this.adminService.getStats());
    } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
  }

  async getUsers(req, res) {
    try {
      const { search = '', page = 1, limit = 30 } = req.query;
      res.json(await this.adminService.getUsers({ search, page, limit }));
    } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
  }

  async getUserList(req, res) {
    try {
      res.json(await this.adminService.getUserList());
    } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
  }

  async banUser(req, res) {
    try {
      res.json(await this.adminService.banUser(req.user.id, req.params.id));
    } catch (e) {
      if (e.type === 'not_found') return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      if (e.type === 'forbidden') return res.status(403).json({ error: e.message });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async unbanUser(req, res) {
    try {
      res.json(await this.adminService.unbanUser(req.user.id, req.params.id));
    } catch (e) {
      if (e.type === 'not_found') return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async deleteUser(req, res) {
    try {
      res.json(await this.adminService.deleteUser(req.user.id, req.params.id));
    } catch (e) {
      if (e.type === 'not_found') return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      if (e.type === 'forbidden') return res.status(403).json({ error: e.message });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async getListings(req, res) {
    try {
      const { search = '', category = '', status = '', authorId = '', page = 1, limit = 30 } = req.query;
      res.json(await this.adminService.getListings({ search, category, status, authorId, page, limit }));
    } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
  }

  async deleteListing(req, res) {
    try {
      res.json(await this.adminService.deleteListing(req.user.id, req.params.id));
    } catch (e) {
      if (e.type === 'not_found') return res.status(404).json({ error: 'İlan bulunamadı' });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async getComments(req, res) {
    try {
      const { search = '', page = 1, limit = 30 } = req.query;
      res.json(await this.adminService.getComments({ search, page, limit }));
    } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
  }

  async deleteComment(req, res) {
    try {
      res.json(await this.adminService.deleteComment(req.user.id, req.params.id));
    } catch (e) {
      if (e.type === 'not_found') return res.status(404).json({ error: 'Yorum bulunamadı' });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async getAuditLogs(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      res.json(await this.adminService.getAuditLogs({ page, limit }));
    } catch { res.status(500).json({ error: 'Sunucu hatası' }); }
  }
}

module.exports = { AdminController };
