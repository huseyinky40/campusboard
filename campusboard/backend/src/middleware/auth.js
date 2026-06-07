function requireAuth(authService) {
  return async (req, res, next) => {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });

    try {
      const payload = authService.verify(header.slice(7));
      const user = await authService.getSessionUser(payload.id);
      if (!user) return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
      if (user.is_banned) return res.status(403).json({ error: 'Hesabınız askıya alınmıştır' });
      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }
  };
}

module.exports = { requireAuth };
