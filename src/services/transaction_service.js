const TransactionRepository = require('../repositories/transaction_repository');
const CategoryService = require('./category_service');

class TransactionService {
  async create(data) {
    if (!['income', 'expense'].includes(data.type)) {
      throw new Error('Tipo deve ser income ou expense');
    }
    if (!data.amount || isNaN(data.amount) || Number(data.amount) <= 0) {
      throw new Error('Valor deve ser um número positivo');
    }
    if (!data.category_id) {
      throw new Error('Categoria é obrigatória');
    }
    if (!data.user_id) {
      throw new Error('Usuário é obrigatório');
    }
    const category = await CategoryService.findById(data.category_id);
    if (!category) {
      throw new Error('Categoria não encontrada');
    }
    return TransactionRepository.create({
      type: data.type,
      amount: Number(data.amount),
      description: data.description || null,
      category_id: data.category_id,
      user_id: data.user_id,
      date: data.date || new Date(),
    });
  }

  async getMonthTransactions(year, month, userId) {
    return TransactionRepository.findByMonth(year, month, userId);
  }

  async getMonthSummary(year, month, userId) {
    return TransactionRepository.getMonthSummary(year, month, userId);
  }

  async delete(id) {
    return TransactionRepository.delete(id);
  }
}

module.exports = new TransactionService();
