const jwt = require('jsonwebtoken');
const AuthService = require('../services/auth_service');

class AuthMiddleware {
  async verifyToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    try {
      const secret = process.env.JWT_SECRET || 'your_jwt_secret';
      const decoded = jwt.verify(cleanToken, secret);

      const session = await AuthService.findSessionByToken(cleanToken);
      if (!session) {
        return res.status(401).json({ error: 'Sessão inválida ou expirada' });
      }

      req.userId = decoded.user_id;
      next();
    } catch (error) {

      return res.status(401).json({ error: error });
    }
  }
}

module.exports = new AuthMiddleware();