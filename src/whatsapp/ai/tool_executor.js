const TransactionService = require('../../services/transaction_service');
const TransactionRepository = require('../../repositories/transaction_repository');
const ReportService = require('../../services/report_service');
const GoalService = require('../../services/goal_service');
const GoalRepository = require('../../repositories/goal_repository');
const RecurringTransactionService = require('../../services/recurring_transaction_service');
const RecurringTransactionRepository = require('../../repositories/recurring_transaction_repository');
const CategoryBudgetService = require('../../services/category_budget_service');
const CategoryBudgetRepository = require('../../repositories/category_budget_repository');
const CategoryRepository = require('../../repositories/category_repository');
const ExportService = require('../../services/export_service');
const SubscriptionService = require('../../services/subscription_service');
const SubscriptionRepository = require('../../repositories/subscription_repository');
const UserRepository = require('../../repositories/user_respository');

const FREQ_LABELS = {
  daily: 'diária', weekly: 'semanal', monthly: 'mensal', yearly: 'anual',
};

function fmtBRL(value) {
  return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).split('-');
  return `${d}/${m}/${y}`;
}

class ToolExecutor {
  async execute(userId, toolName, input) {
    try {
      switch (toolName) {
        case 'create_transaction':         return await this._createTransaction(userId, input);
        case 'list_transactions':          return await this._listTransactions(userId, input);
        case 'edit_transaction':           return await this._editTransaction(userId, input);
        case 'delete_transaction':         return await this._deleteTransaction(userId, input);
        case 'get_balance':                return await this._getBalance(userId);
        case 'get_monthly_report':         return await this._getMonthlyReport(userId, input);
        case 'list_goals':                 return await this._listGoals(userId);
        case 'create_goal':                return await this._createGoal(userId, input);
        case 'contribute_to_goal':         return await this._contributeToGoal(userId, input);
        case 'list_recurring_transactions':return await this._listRecurring(userId);
        case 'create_recurring_transaction':return await this._createRecurring(userId, input);
        case 'delete_recurring_transaction':return await this._deleteRecurring(userId, input);
        case 'list_budgets':               return await this._listBudgets(userId);
        case 'set_budget':                 return await this._setBudget(userId, input);
        case 'export_report':              return await this._exportReport(userId, input);
        case 'get_subscription_info':      return await this._getSubscriptionInfo(userId);
        case 'update_profile':             return await this._updateProfile(userId, input);
        default:
          return { error: `Tool desconhecida: ${toolName}` };
      }
    } catch (err) {
      console.error(`[ToolExecutor] ${toolName} userId=${userId}:`, err.message);
      return { error: err.message };
    }
  }

  // Retorna texto legível para confirmação antes de executar ações destrutivas
  summarizeAction(toolName, input) {
    switch (toolName) {
      case 'delete_transaction':
        return `🗑️ Deletar transação: *${input.search_description || `ID ${input.transaction_id}`}*`;
      case 'edit_transaction': {
        const changes = [];
        if (input.amount !== undefined) changes.push(`valor → ${fmtBRL(input.amount)}`);
        if (input.description !== undefined) changes.push(`descrição → "${input.description}"`);
        if (input.category_name !== undefined) changes.push(`categoria → ${input.category_name}`);
        if (input.date !== undefined) changes.push(`data → ${fmtDate(input.date)}`);
        return `✏️ Editar transação *${input.search_description || `ID ${input.transaction_id}`}*:\n${changes.join(', ')}`;
      }
      case 'create_recurring_transaction':
        return (
          `🔄 Criar recorrente *${input.description || ''}*\n` +
          `${input.type === 'expense' ? '📉 Saída' : '📈 Entrada'}: ${fmtBRL(input.amount)}\n` +
          `Frequência: ${FREQ_LABELS[input.frequency] || input.frequency}`
        );
      case 'delete_recurring_transaction':
        return `🗑️ Remover recorrente: *${input.search_description || `ID ${input.recurring_id}`}*`;
      case 'set_budget':
        return `💼 Definir orçamento de *${fmtBRL(input.amount)}/mês* para categoria *${input.category_name}*`;
      case 'export_report':
        return `📤 Gerar relatório *${input.format.toUpperCase()}* — ${input.month || 'mês atual'}/${input.year || new Date().getFullYear()}`;
      default:
        return `Executar: ${toolName}`;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  async _resolveCategory(userId, categoryName, type) {
    const cats = await CategoryRepository.findByType(type, userId);
    if (!cats.length) return null;
    if (!categoryName) return cats[0];
    const lower = categoryName.toLowerCase().trim();
    return (
      cats.find(c => c.name.toLowerCase() === lower) ||
      cats.find(c => c.name.toLowerCase().includes(lower)) ||
      cats.find(c => lower.includes(c.name.toLowerCase())) ||
      cats[0]
    );
  }

  async _resolveGoal(userId, goalName, goalId) {
    if (goalId) return GoalRepository.findById(goalId);
    const goals = await GoalService.listByUser(userId);
    if (!goals.length) return null;
    if (!goalName) return goals[0];
    const lower = goalName.toLowerCase().trim();
    return (
      goals.find(g => g.name.toLowerCase() === lower) ||
      goals.find(g => g.name.toLowerCase().includes(lower)) ||
      goals[0]
    );
  }

  async _findTransactionByDescOrId(userId, transactionId, searchDescription, limit = 10) {
    if (transactionId) {
      const tx = await TransactionRepository.findById(transactionId);
      if (tx && tx.user_id === userId) return tx;
      return null;
    }
    if (searchDescription) {
      const recent = await TransactionRepository.findRecentForUser(userId, limit);
      const lower = searchDescription.toLowerCase();
      return recent.find(t =>
        (t.description && t.description.toLowerCase().includes(lower)) ||
        (t.category && t.category.name.toLowerCase().includes(lower))
      ) || null;
    }
    return null;
  }

  // ─── Transações ───────────────────────────────────────────────────────────

  async _createTransaction(userId, input) {
    const canCreate = await SubscriptionService.canCreateTransaction(userId);
    if (!canCreate) {
      return {
        error: 'Limite de transações do plano Free atingido este mês.',
        upgrade_hint: true,
      };
    }

    const category = await this._resolveCategory(userId, input.category_name, input.type);
    if (!category) {
      return { error: `Nenhuma categoria encontrada para "${input.category_name || 'padrão'}". Crie categorias primeiro.` };
    }

    const tx = await TransactionService.create({
      type: input.type,
      amount: input.amount,
      description: input.description || null,
      category_id: category.id,
      date: input.date || new Date().toISOString().split('T')[0],
      user_id: userId,
    });

    return {
      success: true,
      transaction: {
        id: tx.id,
        type: tx.type,
        amount: parseFloat(tx.amount),
        amount_formatted: fmtBRL(tx.amount),
        category: category.name,
        description: tx.description,
        date: tx.date,
        date_formatted: fmtDate(String(tx.date)),
      },
    };
  }

  async _listTransactions(userId, input) {
    const now = new Date();
    const month = input.month || now.getMonth() + 1;
    const year = input.year || now.getFullYear();
    const limit = input.limit || 10;

    let transactions = await TransactionRepository.findByMonth(year, month, userId);

    if (input.type && input.type !== 'all') {
      transactions = transactions.filter(t => t.type === input.type);
    }
    if (input.category_name) {
      const lower = input.category_name.toLowerCase();
      transactions = transactions.filter(t =>
        t.category && t.category.name.toLowerCase().includes(lower)
      );
    }

    transactions = transactions.slice(0, limit);

    return {
      success: true,
      count: transactions.length,
      month,
      year,
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        amount_formatted: fmtBRL(t.amount),
        category: t.category?.name || '',
        description: t.description,
        date_formatted: fmtDate(String(t.date)),
      })),
    };
  }

  async _editTransaction(userId, input) {
    const tx = await this._findTransactionByDescOrId(
      userId,
      input.transaction_id,
      input.search_description,
    );
    if (!tx) {
      return { error: 'Transação não encontrada. Tente listar suas transações recentes para ver os detalhes.' };
    }

    const updates = {};
    if (input.amount !== undefined) updates.amount = input.amount;
    if (input.description !== undefined) updates.description = input.description;
    if (input.date !== undefined) updates.date = input.date;
    if (input.category_name !== undefined) {
      const cat = await this._resolveCategory(userId, input.category_name, tx.type);
      if (cat) updates.category_id = cat.id;
    }

    if (Object.keys(updates).length === 0) {
      return { error: 'Nenhum campo para atualizar foi fornecido.' };
    }

    const updated = await TransactionService.update(tx.id, updates, userId);
    return {
      success: true,
      message: `Transação atualizada com sucesso.`,
      transaction: {
        id: updated.id,
        amount_formatted: fmtBRL(updated.amount),
        description: updated.description,
        date_formatted: fmtDate(String(updated.date)),
      },
    };
  }

  async _deleteTransaction(userId, input) {
    const tx = await this._findTransactionByDescOrId(
      userId,
      input.transaction_id,
      input.search_description,
    );
    if (!tx) {
      return { error: 'Transação não encontrada. Verifique o ID ou a descrição.' };
    }
    await TransactionService.delete(tx.id, userId);
    return {
      success: true,
      message: `Transação removida: ${fmtBRL(tx.amount)} em ${tx.category?.name || ''} (${fmtDate(String(tx.date))}).`,
    };
  }

  // ─── Saldo e Relatórios ───────────────────────────────────────────────────

  async _getBalance(userId) {
    const now = new Date();
    const totals = await ReportService.getMonthTotals(now.getFullYear(), now.getMonth() + 1, userId);
    return {
      success: true,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      income: totals.totalIncome,
      income_formatted: fmtBRL(totals.totalIncome),
      expense: totals.totalExpense,
      expense_formatted: fmtBRL(totals.totalExpense),
      balance: totals.balance,
      balance_formatted: fmtBRL(Math.abs(totals.balance)),
      balance_positive: totals.balance >= 0,
    };
  }

  async _getMonthlyReport(userId, input) {
    const now = new Date();
    const month = input.month || now.getMonth() + 1;
    const year = input.year || now.getFullYear();

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevTotals = await ReportService.getMonthTotals(prevYear, prevMonth, userId);
    const report = await ReportService.generateMonthlyReport(year, month, userId, prevTotals);

    return { success: true, month, year, report_text: report };
  }

  // ─── Metas ────────────────────────────────────────────────────────────────

  async _listGoals(userId) {
    const goals = await GoalService.listByUser(userId);
    if (!goals.length) {
      return { success: true, goals: [], message: 'Nenhuma meta ativa encontrada.' };
    }
    return {
      success: true,
      goals: goals.map(g => {
        const current = parseFloat(g.current_amount);
        const target = parseFloat(g.target_amount);
        const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
        return {
          id: g.id,
          name: g.name,
          target_formatted: fmtBRL(target),
          current_formatted: fmtBRL(current),
          remaining_formatted: fmtBRL(Math.max(0, target - current)),
          progress_pct: pct,
          deadline_formatted: g.deadline ? fmtDate(String(g.deadline)) : null,
          status: g.status,
        };
      }),
    };
  }

  async _createGoal(userId, input) {
    const goal = await GoalService.create(userId, input.name, input.target_amount, input.deadline || null);
    return {
      success: true,
      goal: {
        id: goal.id,
        name: goal.name,
        target_formatted: fmtBRL(goal.target_amount),
        deadline_formatted: goal.deadline ? fmtDate(String(goal.deadline)) : null,
      },
    };
  }

  async _contributeToGoal(userId, input) {
    const goal = await this._resolveGoal(userId, input.goal_name, input.goal_id);
    if (!goal) {
      return { error: 'Meta não encontrada. Use "minhas metas" para ver as metas ativas.' };
    }

    const updated = await GoalService.contribute(goal.id, userId, input.amount, input.note || null);
    const current = parseFloat(updated.current_amount);
    const target = parseFloat(updated.target_amount);
    const completed = updated.status === 'completed';

    return {
      success: true,
      goal_name: updated.name,
      contribution_formatted: fmtBRL(input.amount),
      current_formatted: fmtBRL(current),
      target_formatted: fmtBRL(target),
      progress_pct: Math.min(100, Math.round((current / target) * 100)),
      completed,
    };
  }

  // ─── Recorrentes (Pro) ────────────────────────────────────────────────────

  async _listRecurring(userId) {
    const list = await RecurringTransactionService.listByUser(userId);
    if (!list.length) {
      return { success: true, recurring: [], message: 'Nenhuma transação recorrente configurada.' };
    }
    return {
      success: true,
      recurring: list.map(r => ({
        id: r.id,
        type: r.type,
        description: r.description,
        amount_formatted: fmtBRL(r.amount),
        category: r.category?.name || '',
        frequency: FREQ_LABELS[r.frequency] || r.frequency,
        next_date_formatted: fmtDate(r.next_date),
      })),
    };
  }

  async _createRecurring(userId, input) {
    const category = await this._resolveCategory(userId, input.category_name, input.type);
    if (!category) {
      return { error: `Categoria não encontrada para "${input.category_name || 'padrão'}".` };
    }

    const startDate = input.start_date || new Date().toISOString().split('T')[0];
    const rt = await RecurringTransactionService.create({
      type: input.type,
      amount: input.amount,
      description: input.description || null,
      category_id: category.id,
      frequency: input.frequency,
      next_date: startDate,
    }, userId);

    return {
      success: true,
      recurring: {
        id: rt.id,
        description: rt.description,
        amount_formatted: fmtBRL(rt.amount),
        category: category.name,
        frequency: FREQ_LABELS[rt.frequency] || rt.frequency,
        next_date_formatted: fmtDate(rt.next_date),
      },
    };
  }

  async _deleteRecurring(userId, input) {
    let record = null;
    if (input.recurring_id) {
      record = await RecurringTransactionRepository.findById(input.recurring_id);
      if (record && record.user_id !== userId) record = null;
    }
    if (!record && input.search_description) {
      const list = await RecurringTransactionService.listByUser(userId);
      const lower = input.search_description.toLowerCase();
      record = list.find(r =>
        (r.description && r.description.toLowerCase().includes(lower)) ||
        (r.category && r.category.name.toLowerCase().includes(lower))
      ) || null;
    }
    if (!record) {
      return { error: 'Transação recorrente não encontrada. Use "minhas recorrentes" para listar.' };
    }

    await RecurringTransactionService.deactivate(record.id, userId);
    return {
      success: true,
      message: `Recorrente *${record.description || record.category?.name}* removida.`,
    };
  }

  // ─── Orçamentos (Pro) ─────────────────────────────────────────────────────

  async _listBudgets(userId) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const budgets = await CategoryBudgetService.findByUserAndMonth(userId, month);

    if (!budgets.length) {
      return { success: true, budgets: [], message: 'Nenhum orçamento definido para este mês.' };
    }

    const results = await Promise.all(budgets.map(async b => {
      const spent = await CategoryBudgetRepository.getSpentByCategory(
        userId, b.category_id, month
      );
      const limit = parseFloat(b.amount);
      const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
      return {
        category: b.category?.name || '',
        limit_formatted: fmtBRL(limit),
        spent_formatted: fmtBRL(spent),
        remaining_formatted: fmtBRL(Math.max(0, limit - spent)),
        progress_pct: pct,
        over_budget: spent > limit,
      };
    }));

    return { success: true, budgets: results };
  }

  async _setBudget(userId, input) {
    const category = await this._resolveCategory(userId, input.category_name, 'expense');
    if (!category) {
      return { error: `Categoria "${input.category_name}" não encontrada.` };
    }

    await CategoryBudgetService.upsert(userId, category.id, input.amount);
    return {
      success: true,
      message: `Orçamento de *${fmtBRL(input.amount)}/mês* definido para *${category.name}*.`,
    };
  }

  // ─── Exportação (Pro) ─────────────────────────────────────────────────────

  async _exportReport(userId, input) {
    const now = new Date();
    const month = input.month || now.getMonth() + 1;
    const year = input.year || now.getFullYear();
    const format = input.format;

    if (format === 'excel') {
      const buffer = await ExportService.generateExcel(year, month, userId);
      const filename = `relatorio_${year}_${String(month).padStart(2, '0')}.xlsx`;
      return {
        success: true,
        media: {
          data: buffer.toString('base64'),
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename,
        },
        message: `📊 Relatório Excel de ${month}/${year} gerado!`,
      };
    }

    if (format === 'pdf') {
      const doc = await ExportService.generatePDF(year, month, userId);
      const chunks = [];
      await new Promise((resolve, reject) => {
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', resolve);
        doc.on('error', reject);
      });
      const buffer = Buffer.concat(chunks);
      const filename = `relatorio_${year}_${String(month).padStart(2, '0')}.pdf`;
      return {
        success: true,
        media: {
          data: buffer.toString('base64'),
          mimetype: 'application/pdf',
          filename,
        },
        message: `📄 Relatório PDF de ${month}/${year} gerado!`,
      };
    }

    return { error: `Formato inválido: ${format}. Use "pdf" ou "excel".` };
  }

  // ─── Perfil e Plano ───────────────────────────────────────────────────────

  async _getSubscriptionInfo(userId) {
    const sub = await SubscriptionRepository.findActiveByUserId(userId);
    if (!sub) return { error: 'Nenhuma assinatura encontrada.' };

    const plan = sub.plan;
    const isPro = plan?.name !== 'free';
    const features = [];
    if (plan?.recurring_transactions) features.push('Transações Recorrentes');
    if (plan?.category_budgets) features.push('Orçamentos por Categoria');
    if (plan?.pdf_export) features.push('Exportação PDF/Excel');
    if (plan?.whatsapp_reports) features.push('Relatórios WhatsApp');
    if (plan?.ai_chat) features.push('Chat com IA');

    const limit = plan?.max_transactions_per_month;
    const txCount = await SubscriptionRepository.countTransactionsThisMonth(userId);

    return {
      success: true,
      plan_name: plan?.display_name || plan?.name,
      is_pro: isPro,
      features,
      transactions_used: txCount,
      transactions_limit: limit === -1 ? 'Ilimitado' : limit,
      expires_at: sub.expires_at ? fmtDate(sub.expires_at.toISOString().split('T')[0]) : null,
    };
  }

  async _updateProfile(userId, input) {
    if (!input.name || !input.name.trim()) {
      return { error: 'Nome não pode estar vazio.' };
    }
    await UserRepository.update(userId, { name: input.name.trim() });
    return { success: true, message: `Nome atualizado para *${input.name.trim()}*.` };
  }
}

module.exports = new ToolExecutor();
