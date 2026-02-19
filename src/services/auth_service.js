const AuthRepository = require('../repositories/auth_respository.js');

class AuthService {
  async login(data) {

    if(!data.email || !this._validateEmail(data.email)) {
      throw new Error('Email is required');
    }
    if(!data.password || !this._validatePassword(data.password)) {
      throw new Error('Password is required');
    }

    console.log('AuthService login called with data:', data);

    return AuthRepository.login(data);
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
