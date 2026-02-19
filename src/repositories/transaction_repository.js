const { Transaction, Category } = require('../models');
const { Op } = require('sequelize');

class TransactionRepository {
  async create(data) {
    return Transaction.create(data);
  }

  async findByMonth(year, month, userId) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return Transaction.findAll({
      where: {
        user_id: userId,
        date: { [Op.between]: [startDate, endDate] },
      },
      include: [{ model: Category, as: 'category' }],
      order: [['date', 'ASC']],
    });
  }

  async getMonthSummary(year, month, userId) {
    const database = require('../configs/database');
    const sequelize = database.connection;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return Transaction.findAll({
      attributes: [
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.col('category.name'), 'category_name'],
      ],
      include: [{
        model: Category,
        as: 'category',
        attributes: [],
      }],
      where: {
        user_id: userId,
        date: { [Op.between]: [startDate, endDate] },
      },
      group: ['type', 'category_id', 'category.name'],
      raw: true,
    });
  }

  async delete(id) {
    const transaction = await Transaction.findByPk(id);
    if (!transaction) throw new Error('Transação não encontrada');
    await transaction.destroy();
    return true;
  }
}

module.exports = new TransactionRepository();
