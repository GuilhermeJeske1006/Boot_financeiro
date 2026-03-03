const { CategoryBudget, Category, Transaction } = require('../models');
const { Op } = require('sequelize');
const database = require('../configs/database');

class CategoryBudgetRepository {
  async upsert(userId, categoryId, month, amount) {
    const existing = await CategoryBudget.findOne({
      where: { user_id: userId, category_id: categoryId, month },
    });
    if (existing) {
      existing.amount = amount;
      existing.updated_at = new Date();
      await existing.save();
      return existing;
    }
    return CategoryBudget.create({ user_id: userId, category_id: categoryId, month, amount });
  }

  async findByUserAndMonth(userId, month) {
    return CategoryBudget.findAll({
      where: { user_id: userId, month },
      include: [{ model: Category, as: 'category' }],
      order: [[{ model: Category, as: 'category' }, 'name', 'ASC']],
    });
  }

  async findOne(userId, categoryId, month) {
    return CategoryBudget.findOne({
      where: { user_id: userId, category_id: categoryId, month },
      include: [{ model: Category, as: 'category' }],
    });
  }

  async findById(id) {
    return CategoryBudget.findByPk(id, {
      include: [{ model: Category, as: 'category' }],
    });
  }

  async delete(id) {
    const budget = await CategoryBudget.findByPk(id);
    if (!budget) throw new Error('Orçamento não encontrado');
    await budget.destroy();
    return true;
  }

  async getSpentByCategory(userId, categoryId, month) {
    const sequelize = database.connection;
    const [year, m] = month.split('-');
    const startDate = `${year}-${m}-01`;
    const lastDay = new Date(parseInt(year), parseInt(m), 0).getDate();
    const endDate = `${year}-${m}-${String(lastDay).padStart(2, '0')}`;

    const result = await Transaction.findOne({
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      where: {
        user_id: userId,
        category_id: categoryId,
        type: 'expense',
        date: { [Op.between]: [startDate, endDate] },
      },
      raw: true,
    });
    return parseFloat(result?.total || 0);
  }
}

module.exports = new CategoryBudgetRepository();
