
const TransactionService = require('../services/transaction_service');

class TransactionController {

  async create(req, res) {
    try {
      const transaction = await TransactionService.create({
        ...req.body,
        user_id: req.body.company_id ? null : req.userId,
      });
      return res.status(201).json({
        message: 'Transação criada com sucesso',
        transaction,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }

  async findByMonth(req, res) {
    try {
      const { year, month, company_id, category_id } = req.query;
      if (!year || !month) {
        return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
      }
      const transactions = await TransactionService.getMonthTransactions(
        year,
        month,
        req.userId,
        company_id || null,
        category_id || null
      );
      return res.json(transactions);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }

  async getMonthlySummary(req, res) {
    try {
      const { year, month, company_id, category_id } = req.query;
      if (!year || !month) {
        return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
      }
      const summary = await TransactionService.getMonthSummary(
        year,
        month,
        req.userId,
        company_id || null,
        category_id || null
      );
      return res.json(summary);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }

  async findByCompany(req, res) {
    try {
      const { year, month, category_id } = req.query;
      const transactions = await TransactionService.getByCompanyId(
        req.params.companyId,
        year || null,
        month || null,
        category_id || null
      );
      return res.json(transactions);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }

  async getCompaniesSummary(req, res) {
    try {
      const { company_id, year, month, category_id } = req.query;
      const summary = await TransactionService.getCompaniesSummary(
        req.userId,
        company_id || null,
        year || null,
        month || null,
        category_id || null
      );
      return res.json(summary);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      await TransactionService.delete(req.params.id, req.userId);
      return res.json({ message: 'Transação excluída com sucesso' });
    } catch (error) {
      console.log(error);
      const status = error.message.includes('permissão') ? 403 : 400;
      return res.status(status).json({ error: error.message });
    }
  }
}

module.exports = new TransactionController();
