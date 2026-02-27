const TransactionRepository = require('../repositories/transaction_repository');
const CategoryService = require('./category_service');
const CompanyService = require('./company_service');

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
    if (!data.user_id && !data.company_id) {
      throw new Error('Usuário ou empresa é obrigatório');
    }
    if (data.user_id && data.company_id) {
      throw new Error('Transação não pode ter usuário e empresa simultaneamente');
    }
    if (data.company_id) {
      const company = await CompanyService.findById(data.company_id);
      if (!company) {
        throw new Error('Empresa não encontrada');
      }
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
      user_id: data.user_id || null,
      company_id: data.company_id || null,
      date: data.date || new Date(),
    });
  }


  async getMonthTransactions(year, month, userId, companyId = null, categoryId = null) {
    return TransactionRepository.findByMonth(year, month, userId, companyId, categoryId);
  }

  async getMonthSummary(year, month, userId, companyId = null, categoryId = null) {
    return TransactionRepository.getMonthSummary(year, month, userId, companyId, categoryId);
  }

  async getByCompanyId(companyId, year = null, month = null, categoryId = null) {
    return TransactionRepository.findByCompanyId(companyId, year, month, categoryId);
  }

  async getCompaniesSummary(userId, companyId = null, year = null, month = null, categoryId = null) {
    return TransactionRepository.getCompaniesSummary(userId, companyId, year, month, categoryId);
  }

  async delete(id, userId) {
    const transaction = await TransactionRepository.findById(id);
    if (!transaction) throw new Error('Transação não encontrada');

    if (transaction.user_id && transaction.user_id !== userId) {
      throw new Error('Sem permissão para excluir esta transação');
    }

    if (transaction.company_id) {
      const hasOwnership = await CompanyService.checkOwnership(transaction.company_id, userId);
      if (!hasOwnership) {
        throw new Error('Sem permissão para excluir esta transação');
      }
    }

    return TransactionRepository.delete(id);
  }
}

module.exports = new TransactionService();
