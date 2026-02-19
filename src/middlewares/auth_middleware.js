class AuthMiddleware {
  verifyToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    if (token !== 'valid-token') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    next();
  }
}

module.exports = new AuthMiddleware();