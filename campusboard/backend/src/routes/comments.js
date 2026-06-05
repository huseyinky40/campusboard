const express = require('express');

function createCommentsRouter(controller) {
  const router = express.Router();

  router.get('/:id/comments',                    (req, res) => controller.getByListing(req, res));
  router.post('/:id/comments',                   (req, res) => controller.create(req, res));
  router.delete('/:id/comments/:commentId',      (req, res) => controller.delete(req, res));

  return router;
}

module.exports = { createCommentsRouter };
