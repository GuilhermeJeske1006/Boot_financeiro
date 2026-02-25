const AuthService = require('../services/auth_service');

class AuthController {
  async login(req, res) {
    const { email, password } = req.body;
    try {
      const result = await AuthService.login({ email, password });
      return res.status(200).json({
        message: 'Login realizado com sucesso',
        token: result.token,
        user: result.user,
      });
    } catch (error) {
      console.log(error);
      return res.status(401).json({ error: error.message });
    }
  }

  async logout(req, res) {
    try {
      const token = req.headers['authorization'];

      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      await AuthService.logout(cleanToken);
      return res.status(200).json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      await AuthService.forgotPassword(email);
      return res.status(200).json({ message: 'Email de redefinição de senha enviado' });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      await AuthService.resetPassword(token, password);
      return res.status(200).json({ message: 'Senha redefinida com sucesso' });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();