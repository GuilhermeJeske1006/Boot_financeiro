const { Transaction, Category, Company } = require('../models');
const { Op } = require('sequelize');

class TransactionRepository {
  async create(data) {
    return Transaction.create(data);
  }

  async findByMonth(year, month, userId, companyId = null) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const whereClause = {
      date: { [Op.between]: [startDate, endDate] },
    };

    if (companyId) {
      whereClause.company_id = companyId;
    } else {
      whereClause.user_id = userId;
    }

    return Transaction.findAll({
      where: whereClause,
      include: [
        { model: Category, as: 'category' },
        { model: Company, as: 'company', attributes: ['id', 'name'] },
      ],
      order: [['date', 'ASC']],
    });
  }

  async getMonthSummary(year, month, userId, companyId = null) {
    const database = require('../configs/database');
    const sequelize = database.connection;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const whereClause = {
      date: { [Op.between]: [startDate, endDate] },
    };

    if (companyId) {
      whereClause.company_id = companyId;
    } else {
      whereClause.user_id = userId;
    }

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
      where: whereClause,
      group: ['type', 'category_id', 'category.name'],
      raw: true,
    });
  }

  async findByCompanyId(companyId, year = null, month = null) {
    const whereClause = { company_id: companyId };

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      whereClause.date = { [Op.between]: [startDate, endDate] };
    }

    return Transaction.findAll({
      where: whereClause,
      include: [
        { model: Category, as: 'category' },
        { model: Company, as: 'company', attributes: ['id', 'name'] },
      ],
      order: [['date', 'DESC']],
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
