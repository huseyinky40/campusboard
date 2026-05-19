class ListingController {
  constructor(listingService) {
    this.service = listingService;
  }

  getAll(req, res) {
    const { category, faculty, status, search, mine, page, limit } = req.query;
    const result = this.service.getAll(req.user.id, {
      category, faculty, status, search, page, limit,
      mine: mine === 'true',
    });
    res.json(result);
  }

  getById(req, res) {
    const listing = this.service.getById(req.user.id, Number(req.params.id));
    if (!listing) return res.status(404).json({ error: 'İlan bulunamadı' });
    res.json({ data: listing });
  }

  create(req, res) {
    try {
      const listing = this.service.create(req.user.id, req.body);
      res.status(201).json({ data: listing, message: 'İlan başarıyla oluşturuldu' });
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  update(req, res) {
    try {
      const listing = this.service.update(req.user.id, Number(req.params.id), req.body);
      if (!listing) return res.status(404).json({ error: 'İlan bulunamadı' });
      res.json({ data: listing, message: 'İlan başarıyla güncellendi' });
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  updateStatus(req, res) {
    try {
      const listing = this.service.updateStatus(req.user.id, Number(req.params.id), req.body.status);
      if (!listing) return res.status(404).json({ error: 'İlan bulunamadı' });
      res.json({ data: listing, message: 'Durum güncellendi' });
    } catch (err) {
      if (err.type === 'validation') return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  delete(req, res) {
    const deleted = this.service.delete(req.user.id, Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'İlan bulunamadı' });
    res.json({ message: 'İlan başarıyla silindi' });
  }

  getCategories(req, res) { res.json({ data: this.service.getCategories() }); }
  getFaculties(req, res)  { res.json({ data: this.service.getFaculties() }); }
}

module.exports = { ListingController };
