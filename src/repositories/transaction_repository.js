const { Transaction, Category, Company } = require('../models');
const { Op } = require('sequelize');

class TransactionRepository {
  async create(data) {
    return Transaction.create(data);
  }

  async findByMonth(year, month, userId, companyId = null, categoryId = null) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const whereClause = {
      date: { [Op.between]: [startDate, endDate] },
    };

    if (companyId) {
      whereClause.company_id = companyId;
    } else {
      const userCompanies = await Company.findAll({
        where: { user_id: userId },
        attributes: ['id']
      });
      const companyIds = userCompanies.map(uc => uc.id);
      whereClause.company_id = companyIds;
    }

    if (categoryId) whereClause.category_id = categoryId;

    return Transaction.findAll({
      where: whereClause,
      include: [
        { model: Category, as: 'category' },
        { model: Company, as: 'company', attributes: ['id', 'name'] },
      ],
      order: [['date', 'ASC']],
    });
  }

  async getMonthSummary(year, month, userId, companyId = null, categoryId = null) {
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

    if (categoryId) whereClause.category_id = categoryId;

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

  async findByCompanyId(companyId, year = null, month = null, categoryId = null) {
    const whereClause = { company_id: companyId };

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      whereClause.date = { [Op.between]: [startDate, endDate] };
    }

    if (categoryId) whereClause.category_id = categoryId;

    return Transaction.findAll({
      where: whereClause,
      include: [
        { model: Category, as: 'category' },
        { model: Company, as: 'company', attributes: ['id', 'name'] },
      ],
      order: [['date', 'DESC']],
    });
  }

  async getCompaniesSummary(userId, companyId = null, year = null, month = null, categoryId = null) {
    const database = require('../configs/database');
    const sequelize = database.connection;

    const companyWhere = { user_id: userId };
    if (companyId) companyWhere.id = companyId;

    const companies = await Company.findAll({
      where: companyWhere,
      attributes: ['id', 'name'],
    });

    const companyIds = companies.map(c => c.id);

    if (companyIds.length === 0) return [];

    const transactionWhere = { company_id: companyIds };

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      transactionWhere.date = { [Op.between]: [startDate, endDate] };
    } else if (year) {
      transactionWhere.date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
    }

    if (categoryId) transactionWhere.category_id = categoryId;

    const rows = await Transaction.findAll({
      attributes: [
        'company_id',
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
      ],
      where: transactionWhere,
      group: ['company_id', 'type'],
      raw: true,
    });

    return companies.map(company => {
      const income = rows.find(r => r.company_id === company.id && r.type === 'income');
      const expense = rows.find(r => r.company_id === company.id && r.type === 'expense');
      const totalIncome = parseFloat(income?.total || 0);
      const totalExpense = parseFloat(expense?.total || 0);
      return {
        company_id: company.id,
        company_name: company.name,
        total_income: totalIncome,
        total_expense: totalExpense,
        balance: totalIncome - totalExpense,
      };
    });
  }

  async findById(id) {
    return Transaction.findByPk(id);
  }

  async delete(id) {
    const transaction = await Transaction.findByPk(id);
    if (!transaction) throw new Error('Transação não encontrada');
    await transaction.destroy();
    return true;
  }
}

module.exports = new TransactionRepository();
