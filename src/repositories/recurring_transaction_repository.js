const { RecurringTransaction, Category, User } = require('../models');
const { Op } = require('sequelize');

class RecurringTransactionRepository {
  async create(data) {
    return RecurringTransaction.create(data);
  }

  async findAllByUser(userId) {
    return RecurringTransaction.findAll({
      where: { user_id: userId, is_active: true },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'type'] }],
      order: [['next_date', 'ASC']],
    });
  }

  async findById(id) {
    return RecurringTransaction.findByPk(id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'type'] }],
    });
  }

  async update(id, data) {
    const record = await RecurringTransaction.findByPk(id);
    if (!record) return null;
    return record.update(data);
  }

  async deactivate(id) {
    const record = await RecurringTransaction.findByPk(id);
    if (!record) return null;
    return record.update({ is_active: false });
  }

  async findDueToday() {
    const today = new Date().toISOString().split('T')[0];
    return RecurringTransaction.findAll({
      where: {
        is_active: true,
        next_date: { [Op.lte]: today },
      },
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: User, as: 'user', attributes: ['id', 'phone'] },
      ],
    });
  }
}

module.exports = new RecurringTransactionRepository();
