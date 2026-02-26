const bcrypt = require('bcrypt');
const UserRepository = require('../repositories/user_respository');

class UserService {
  async create(data) {
    if (!data.email || !this._validateEmail(data.email)) {
      throw new Error('Email is required');
    }
    if(!data.name) {
      throw new Error('Name is required');
    }
    if(!data.password || !this._validatePassword(data.password)) {
      throw new Error('Password is required');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const userData = {
      ...data,
      password: hashedPassword
    };

    return UserRepository.create(userData);
  }

  async findAll() {
    return UserRepository.findAll();
  }

  async findById(id) {
    if (!id) {
      throw new Error('ID is required');
    }
    return UserRepository.findById(id);
  }

  async update(id, data) {
      if (!id) {
        throw new Error('ID is required');
      }
      if (!data.email || !this._validateEmail(data.email)) {
        throw new Error('Email is required');
      }
      if (!data.name) {
        throw new Error('Name is required');
      }
      const userData = { ...data };

      if (data.password) {
        if (!this._validatePassword(data.password)) {
          throw new Error('Password is invalid');
        }
        userData.password = await bcrypt.hash(data.password, 10);
      }

      return UserRepository.update(id, userData);
  }


   _validateEmail(email) {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  }

  _validatePassword(password) {
    return password.length >= 6;
  }
}

module.exports = new UserService();