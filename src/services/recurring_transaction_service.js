const RecurringTransactionRepository = require('../repositories/recurring_transaction_repository');
const TransactionService = require('./transaction_service');

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

function computeNextDate(currentDate, frequency) {
  const date = new Date(currentDate);
  // Avoid timezone shifts by treating as UTC noon
  date.setUTCHours(12, 0, 0, 0);

  switch (frequency) {
    case 'daily':
      date.setUTCDate(date.getUTCDate() + 1);
      break;
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case 'monthly':
      date.setUTCMonth(date.getUTCMonth() + 1);
      break;
    case 'yearly':
      date.setUTCFullYear(date.getUTCFullYear() + 1);
      break;
  }

  return date.toISOString().split('T')[0];
}

class RecurringTransactionService {
  async create(data, ownerUserId) {
    if (!['income', 'expense'].includes(data.type)) {
      throw new Error('Tipo deve ser income ou expense');
    }
    if (!data.amount || isNaN(data.amount) || Number(data.amount) <= 0) {
      throw new Error('Valor deve ser um número positivo');
    }
    if (!data.category_id) {
      throw new Error('Categoria é obrigatória');
    }
    if (!FREQUENCIES.includes(data.frequency)) {
      throw new Error('Frequência deve ser: daily, weekly, monthly ou yearly');
    }
    if (!data.next_date) {
      throw new Error('Data de início (next_date) é obrigatória');
    }

    const user_id = data.company_id ? null : ownerUserId;
    const company_id = data.company_id || null;

    return RecurringTransactionRepository.create({
      type: data.type,
      amount: Number(data.amount),
      description: data.description || null,
      category_id: data.category_id,
      user_id,
      company_id,
      frequency: data.frequency,
      next_date: data.next_date,
      is_active: true,
    });
  }

  async listByUser(userId) {
    return RecurringTransactionRepository.findAllByUser(userId);
  }

  async listByCompany(companyId) {
    return RecurringTransactionRepository.findAllByCompany(companyId);
  }

  async update(id, data, ownerUserId) {
    const record = await RecurringTransactionRepository.findById(id);
    if (!record) throw new Error('Transação recorrente não encontrada');

    const belongsToUser = record.user_id === ownerUserId;
    const belongsToCompany = record.company_id && data.company_id === record.company_id;
    if (!belongsToUser && !belongsToCompany) {
      throw new Error('Sem permissão para editar esta transação recorrente');
    }

    const updates = {};
    if (data.type) updates.type = data.type;
    if (data.amount) updates.amount = Number(data.amount);
    if ('description' in data) updates.description = data.description;
    if (data.category_id) updates.category_id = data.category_id;
    if (data.frequency) {
      if (!FREQUENCIES.includes(data.frequency)) throw new Error('Frequência inválida');
      updates.frequency = data.frequency;
    }
    if (data.next_date) updates.next_date = data.next_date;

    return RecurringTransactionRepository.update(id, updates);
  }

  async deactivate(id, ownerUserId) {
    const record = await RecurringTransactionRepository.findById(id);
    if (!record) throw new Error('Transação recorrente não encontrada');

    if (record.user_id !== ownerUserId && !record.company_id) {
      throw new Error('Sem permissão para remover esta transação recorrente');
    }

    return RecurringTransactionRepository.deactivate(id);
  }

  // Chamado pelo cron: cria transações para todos os registros vencidos e avança next_date
  async processDue() {
    const dueList = await RecurringTransactionRepository.findDueToday();
    const results = { created: 0, errors: 0 };

    for (const rt of dueList) {
      try {
        await TransactionService.create({
          type: rt.type,
          amount: rt.amount,
          description: rt.description,
          category_id: rt.category_id,
          user_id: rt.user_id,
          company_id: rt.company_id,
          date: rt.next_date,
        });

        const newNextDate = computeNextDate(rt.next_date, rt.frequency);
        await RecurringTransactionRepository.update(rt.id, { next_date: newNextDate });
        results.created++;
      } catch (err) {
        console.error(`Erro ao processar transação recorrente id=${rt.id}:`, err.message);
        results.errors++;
      }
    }

    return results;
  }
}

module.exports = new RecurringTransactionService();
