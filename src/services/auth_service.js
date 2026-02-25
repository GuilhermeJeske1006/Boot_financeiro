const AuthRepository = require('../repositories/auth_respository.js');

class AuthService {
  async login(data) {
    if (!data.email || !this._validateEmail(data.email)) {
      throw new Error('Email inválido');
    }
    if (!data.password || !this._validatePassword(data.password)) {
      throw new Error('Senha deve ter no mínimo 6 caracteres');
    }
    return AuthRepository.login(data);
  }

  async logout(token) {
    if (!token) {
      throw new Error('Token é obrigatório');
    }
    return AuthRepository.logout(token);
  }

  async findSessionByToken(token) {
    return AuthRepository.findSessionByToken(token);
  }

  async forgotPassword(email) {
    if (!email || !this._validateEmail(email)) {
      throw new Error('Email inválido');
    }
    return AuthRepository.forgotPassword(email);
  }

  async resetPassword(token, newPassword) {
    if (!token) {
      throw new Error('Token é obrigatório');
    }
    if (!newPassword || !this._validatePassword(newPassword)) {
      throw new Error('Senha deve ter no mínimo 6 caracteres');
    }
    return AuthRepository.resetPassword(token, newPassword);
  }

  _validateEmail(email) {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  }

  _validatePassword(password) {
    return password.length >= 6;
  }
}

module.exports = new AuthService();
