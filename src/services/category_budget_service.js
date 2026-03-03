const CategoryBudgetRepository = require('../repositories/category_budget_repository');
const CategoryService = require('./category_service');

class CategoryBudgetService {
  _currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async upsert(userId, categoryId, amount) {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      throw new Error('Valor deve ser um número positivo');
    }
    const category = await CategoryService.findById(categoryId);
    if (!category) throw new Error('Categoria não encontrada');
    const month = this._currentMonth();
    return CategoryBudgetRepository.upsert(userId, categoryId, month, Number(amount));
  }

  async findByUserAndMonth(userId, month = null) {
    const m = month || this._currentMonth();
    return CategoryBudgetRepository.findByUserAndMonth(userId, m);
  }

  async delete(id, userId) {
    const budget = await CategoryBudgetRepository.findById(id);
    if (!budget) throw new Error('Orçamento não encontrado');
    if (budget.user_id !== userId) throw new Error('Sem permissão para excluir este orçamento');
    return CategoryBudgetRepository.delete(id);
  }

  // Returns an alert message if the 80% or 100% threshold was just crossed, or null.
  // Should only be called for expense transactions.
  async checkBudget(userId, categoryId) {
    const month = this._currentMonth();
    const budget = await CategoryBudgetRepository.findOne(userId, categoryId, month);
    if (!budget) return null;

    const spent = await CategoryBudgetRepository.getSpentByCategory(userId, categoryId, month);
    const limit = parseFloat(budget.amount);
    if (limit <= 0) return null;

    const pct = (spent / limit) * 100;
    const categoryName = budget.category?.name || 'categoria';

    if (pct >= 100) {
      return (
        `🚨 *Orçamento esgotado!*\n\n` +
        `Você atingiu *100%* do orçamento de *${categoryName}* neste mês.\n` +
        `💸 Gasto: R$ ${spent.toFixed(2)} / Limite: R$ ${limit.toFixed(2)}\n\n` +
        `_Considere revisar seus gastos._`
      );
    }

    if (pct >= 80) {
      return (
        `⚠️ *Atenção: ${pct.toFixed(0)}% do orçamento usado!*\n\n` +
        `Você já utilizou *${pct.toFixed(0)}%* do orçamento de *${categoryName}* neste mês.\n` +
        `💸 Gasto: R$ ${spent.toFixed(2)} / Limite: R$ ${limit.toFixed(2)}`
      );
    }

    return null;
  }
}

module.exports = new CategoryBudgetService();
