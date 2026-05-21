class ListingController {
  constructor(listingService) {
    this.service = listingService;
  }

  async getAll(req, res) {
    try {
      const { category, faculty, status, search, mine, page, limit } = req.query;
      const result = await this.service.getAll(req.user.id, {
        category, faculty, status, search, page, limit,
        mine: mine === 'true',
      });
      res.json(result);
    } catch (err) {
      console.error('getAll error:', err);
      res.status(500).json({ error: 'Sunucu hatası', detail: err.message });
    }
  }

  async getSummary(req, res) {
    try {
      const { category, faculty, status, search, mine } = req.query;
      const summary = await this.service.getSummary(req.user.id, {
        category, faculty, status, search,
        mine: mine === 'true',
      });
      res.json(summary);
    } catch (err) {
      console.error('getSummary error:', err);
      res.status(500).json({ error: 'Sunucu hatası', detail: err.message });
    }
  }

  async getById(req, res) {
    try {
      const listing = await this.service.getById(req.user.id, Number(req.params.id));
      if (!listing) return res.status(404).json({ error: 'İlan bulunamadı' });
      res.json({ data: listing });
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async create(req, res) {
    try {
      const listing = await this.service.create(req.user.id, req.body);
      res.status(201).json({ data: listing, message: 'İlan başarıyla oluşturuldu' });
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async update(req, res) {
    try {
      const listing = await this.service.update(req.user.id, Number(req.params.id), req.body);
      if (!listing) return res.status(404).json({ error: 'İlan bulunamadı' });
      res.json({ data: listing, message: 'İlan başarıyla güncellendi' });
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async updateStatus(req, res) {
    try {
      const listing = await this.service.updateStatus(req.user.id, Number(req.params.id), req.body.status);
      if (!listing) return res.status(404).json({ error: 'İlan bulunamadı' });
      res.json({ data: listing, message: 'Durum güncellendi' });
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async delete(req, res) {
    try {
      const deleted = await this.service.delete(req.user.id, Number(req.params.id));
      if (!deleted) return res.status(404).json({ error: 'İlan bulunamadı' });
      res.json({ message: 'İlan başarıyla silindi' });
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  getCategories(req, res) { res.json({ data: this.service.getCategories() }); }
  getFaculties(req, res)  { res.json({ data: this.service.getFaculties() }); }
}

module.exports = { ListingController };
