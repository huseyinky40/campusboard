class CommentController {
  constructor(commentService) {
    this.service = commentService;
  }

  async getByListing(req, res) {
    try {
      const result = await this.service.getByListing(req.user.id, Number(req.params.id));
      res.json(result);
    } catch (err) {
      if (err.type === 'not_found') return res.status(404).json({ error: 'İlan bulunamadı' });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async create(req, res) {
    try {
      const parentId = req.body.parent_id ? Number(req.body.parent_id) : null;
      const comment = await this.service.create(req.user.id, Number(req.params.id), req.body.content, parentId);
      res.status(201).json({ data: comment });
    } catch (err) {
      if (err.type === 'not_found')   return res.status(404).json({ error: 'İlan bulunamadı' });
      if (err.type === 'validation')  return res.status(400).json({ errors: err.errors });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  async delete(req, res) {
    try {
      const deleted = await this.service.delete(
        req.user.id,
        Number(req.params.id),
        Number(req.params.commentId)
      );
      if (!deleted) return res.status(404).json({ error: 'Yorum bulunamadı' });
      res.json({ message: 'Yorum silindi' });
    } catch (err) {
      if (err.type === 'forbidden') return res.status(403).json({ error: 'Bu yorumu silemezsiniz' });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
}

module.exports = { CommentController };
