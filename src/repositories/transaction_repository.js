const { Transaction, Category } = require('../models');
const { Op } = require('sequelize');

class TransactionRepository {
  async create(data) {
    return Transaction.create(data);
  }

  async findByMonth(year, month, userId, categoryId = null) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const whereClause = {
      user_id: userId,
      date: { [Op.between]: [startDate, endDate] },
    };

    if (categoryId) whereClause.category_id = categoryId;

    return Transaction.findAll({
      where: whereClause,
      include: [{ model: Category, as: 'category' }],
      order: [['date', 'ASC']],
    });
  }

  async getMonthSummary(year, month, userId, categoryId = null) {
    const database = require('../configs/database');
    const sequelize = database.connection;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const whereClause = {
      user_id: userId,
      date: { [Op.between]: [startDate, endDate] },
    };

    if (categoryId) whereClause.category_id = categoryId;

    return Transaction.findAll({
      attributes: [
        [sequelize.col('Transaction.type'), 'type'],
        [sequelize.fn('SUM', sequelize.col('Transaction.amount')), 'total'],
        [sequelize.col('category.name'), 'category_name'],
      ],
      include: [{
        model: Category,
        as: 'category',
        attributes: [],
      }],
      where: whereClause,
      group: ['Transaction.type', 'Transaction.category_id', 'category.name', 'category.id'],
      raw: true,
    });
  }

  async findById(id) {
    return Transaction.findByPk(id);
  }

  async findRecentForUser(userId, limit = 10) {
    return Transaction.findAll({
      where: { user_id: userId },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['date', 'DESC']],
      limit,
    });
  }

  async update(id, data) {
    const transaction = await Transaction.findByPk(id);
    if (!transaction) throw new Error('Transação não encontrada');
    await transaction.update(data);
    return transaction;
  }

  async delete(id) {
    const transaction = await Transaction.findByPk(id);
    if (!transaction) throw new Error('Transação não encontrada');
    await transaction.destroy();
    return true;
  }
}

module.exports = new TransactionRepository();
