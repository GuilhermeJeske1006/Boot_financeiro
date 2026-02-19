const { User } = require('../models');
const jwt = require('jsonwebtoken');

class AuthRepository {
  async login(data) {
    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }

    const user = await User.findOne({
      where: { email: data.email }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Here you would normally check the password hash
    if (user.password !== data.password) {
      throw new Error('Invalid email or password');
    }

    // For simplicity, we'll return a dummy token
    const secret = process.env.JWT_SECRET || 'your_jwt_secret';
    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '1h' });
    user.remember_token = token;
    await user.save();

    return token;
  }

}

module.exports = new AuthRepository();
