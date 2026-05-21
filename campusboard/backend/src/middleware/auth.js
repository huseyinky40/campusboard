function requireAuth(authService) {
  return (req, res, next) => {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    try {
      req.user = authService.verify(header.slice(7));
      next();
    } catch {
      res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }
  };
}

module.exports = { requireAuth };
