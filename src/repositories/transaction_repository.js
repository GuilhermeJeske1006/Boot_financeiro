const { Transaction, Category, RecurringTransaction } = require('../models');
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

    const recurringWhere = {
      user_id: userId,
      is_active: true,
      next_date: { [Op.between]: [startDate, endDate] },
    };
    if (categoryId) recurringWhere.category_id = categoryId;

    const [actual, projected] = await Promise.all([
      Transaction.findAll({
        where: whereClause,
        include: [{ model: Category, as: 'category' }],
        order: [['date', 'ASC']],
      }),
      RecurringTransaction.findAll({
        where: recurringWhere,
        include: [{ model: Category, as: 'category' }],
      }),
    ]);

    const projectedTx = projected.map(rt => ({
      id: rt.id,
      type: rt.type,
      amount: rt.amount,
      description: rt.description,
      category_id: rt.category_id,
      user_id: rt.user_id,
      date: rt.next_date,
      category: rt.category,
      is_projected: true,
      frequency: rt.frequency,
    }));

    return [...actual, ...projectedTx].sort((a, b) =>
      String(a.date) < String(b.date) ? -1 : String(a.date) > String(b.date) ? 1 : 0
    );
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

    const recurringWhere = {
      user_id: userId,
      is_active: true,
      next_date: { [Op.between]: [startDate, endDate] },
    };
    if (categoryId) recurringWhere.category_id = categoryId;

    const [actualRows, projected] = await Promise.all([
      Transaction.findAll({
        attributes: [
          [sequelize.col('Transaction.type'), 'type'],
          [sequelize.fn('SUM', sequelize.col('Transaction.amount')), 'total'],
          [sequelize.col('category.name'), 'category_name'],
        ],
        include: [{ model: Category, as: 'category', attributes: [] }],
        where: whereClause,
        group: ['Transaction.type', 'Transaction.category_id', 'category.name', 'category.id'],
        raw: true,
      }),
      RecurringTransaction.findAll({
        where: recurringWhere,
        include: [{ model: Category, as: 'category', attributes: ['name'] }],
      }),
    ]);

    const summaryMap = new Map();
    for (const row of actualRows) {
      summaryMap.set(`${row.type}:${row.category_name}`, {
        type: row.type,
        total: parseFloat(row.total),
        category_name: row.category_name,
      });
    }

    for (const rt of projected) {
      const catName = rt.category?.name || null;
      const key = `${rt.type}:${catName}`;
      if (summaryMap.has(key)) {
        summaryMap.get(key).total += parseFloat(rt.amount);
      } else {
        summaryMap.set(key, {
          type: rt.type,
          total: parseFloat(rt.amount),
          category_name: catName,
        });
      }
    }

    return Array.from(summaryMap.values());
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
