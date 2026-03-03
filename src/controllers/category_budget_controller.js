const CategoryBudgetService = require('../services/category_budget_service');
const SubscriptionService = require('../services/subscription_service');

class CategoryBudgetController {
  async _checkFeature(userId, res) {
    const has = await SubscriptionService.hasFeature(userId, 'category_budgets');
    if (!has) {
      res.status(403).json({ error: 'Funcionalidade exclusiva dos planos Pro e Business' });
      return false;
    }
    return true;
  }

  async upsert(req, res) {
    try {
      const userId = req.userId;
      if (!await this._checkFeature(userId, res)) return;
      const { category_id, amount } = req.body;
      if (!category_id || !amount) {
        return res.status(400).json({ error: 'category_id e amount são obrigatórios' });
      }
      const budget = await CategoryBudgetService.upsert(userId, category_id, amount);
      return res.status(200).json(budget);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async findByMonth(req, res) {
    try {
      const userId = req.userId;
      if (!await this._checkFeature(userId, res)) return;
      const { month } = req.query; // optional: YYYY-MM
      const budgets = await CategoryBudgetService.findByUserAndMonth(userId, month || null);
      return res.status(200).json(budgets);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const userId = req.userId;
      if (!await this._checkFeature(userId, res)) return;
      const { id } = req.params;
      await CategoryBudgetService.delete(id, userId);
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new CategoryBudgetController();
