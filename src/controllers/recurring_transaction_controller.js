const RecurringTransactionService = require('../services/recurring_transaction_service');

class RecurringTransactionController {
  async create(req, res) {
    try {
      const record = await RecurringTransactionService.create(req.body, req.userId);
      return res.status(201).json(record);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async list(req, res) {
    try {
      const { company_id } = req.query;
      const records = company_id
        ? await RecurringTransactionService.listByCompany(Number(company_id))
        : await RecurringTransactionService.listByUser(req.userId);
      return res.json(records);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const record = await RecurringTransactionService.update(
        Number(req.params.id),
        req.body,
        req.userId
      );
      return res.json(record);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async deactivate(req, res) {
    try {
      await RecurringTransactionService.deactivate(Number(req.params.id), req.userId);
      return res.json({ message: 'Transação recorrente removida.' });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new RecurringTransactionController();
