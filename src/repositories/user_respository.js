const { User, Subscription, Plan } = require('../models');

class UserRepository {
  async create(data) {
    const user = await User.create(data);
    const freePlan = await Plan.findOne({ where: { name: 'free' } });
    if (freePlan) {
      await Subscription.create({
        user_id: user.id,
        plan_id: freePlan.id,
        status: 'active',
        starts_at: new Date(),
        expires_at: null,
        payment_provider: 'manual',
      });
    }
    return user;
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
