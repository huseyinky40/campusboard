class FavoriteController {
  constructor(favoriteService) {
    this.service = favoriteService;
  }

  getAll(req, res) {
    const favorites = this.service.getAll(req.user.id);
    res.json({ data: favorites, count: favorites.length });
  }

  toggle(req, res) {
    const listingId = Number(req.params.listingId);
    const result = this.service.toggle(req.user.id, listingId);
    if (!result) return res.status(404).json({ error: 'İlan bulunamadı' });
    res.json(result);
  }
}

module.exports = { FavoriteController };
