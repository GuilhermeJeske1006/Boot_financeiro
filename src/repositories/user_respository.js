const { User } = require('../models');

class UserRepository {
  async create(data) {
    return User.create(data);
  }

  async findAll() {
    return User.findAll();
  }

  async findById(id) {
    return User.findByPk(id);
  }

  async findByPhone(phone) {
    return User.findOne({ where: { phone } });
  }

  async createByPhone(phone, name) {
    return this.create({ name, phone });
  }

  async update(id, data) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user.update(data);
  }

  async delete(id) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }
    await user.destroy();
    return true;
  }
}

module.exports = new UserRepository();
