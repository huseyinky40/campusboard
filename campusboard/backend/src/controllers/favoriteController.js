class FavoriteController {
  constructor(favoriteService) {
    this.service = favoriteService;
  }

  async getAll(req, res) {
    try {
      const favorites = await this.service.getAll(req.user.id);
      res.json({ data: favorites, count: favorites.length });
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async toggle(req, res) {
    try {
      const listingId = Number(req.params.listingId);
      const result = await this.service.toggle(req.user.id, listingId);
      if (!result) return res.status(404).json({ error: 'İlan bulunamadı' });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
}

module.exports = { FavoriteController };
