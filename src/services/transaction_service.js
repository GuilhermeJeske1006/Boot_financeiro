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

  async getMonthTransactions(year, month, userId, categoryId = null) {
    return TransactionRepository.findByMonth(year, month, userId, categoryId);
  }

  async getMonthSummary(year, month, userId, categoryId = null) {
    return TransactionRepository.getMonthSummary(year, month, userId, categoryId);
  }

  async update(id, data, userId) {
    const transaction = await TransactionRepository.findById(id);
    if (!transaction) throw new Error('Transação não encontrada');

    if (transaction.user_id !== userId) {
      throw new Error('Sem permissão para editar esta transação');
    }

    const allowed = {};
    if (data.amount !== undefined) {
      if (isNaN(data.amount) || Number(data.amount) <= 0) throw new Error('Valor deve ser um número positivo');
      allowed.amount = Number(data.amount);
    }
    if (data.description !== undefined) allowed.description = data.description;
    if (data.category_id !== undefined) {
      const category = await CategoryService.findById(data.category_id);
      if (!category) throw new Error('Categoria não encontrada');
      allowed.category_id = data.category_id;
    }
    if (data.date !== undefined) allowed.date = data.date;

    return TransactionRepository.update(id, allowed);
  }

  async delete(id, userId) {
    const transaction = await TransactionRepository.findById(id);
    if (!transaction) throw new Error('Transação não encontrada');

    if (transaction.user_id !== userId) {
      throw new Error('Sem permissão para excluir esta transação');
    }

    return TransactionRepository.delete(id);
  }
}

module.exports = new TransactionService();
