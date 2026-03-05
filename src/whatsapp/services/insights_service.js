const TransactionRepository = require('../../repositories/transaction_repository');
const CategoryBudgetRepository = require('../../repositories/category_budget_repository');
const ReportService = require('../../services/report_service');

class InsightsService {
  // Gera insights semanais para um usuário (resumo de gastos da semana)
  async generateWeeklyInsight(userId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [currentTotals, prevMonth] = await Promise.all([
      ReportService.getMonthTotals(year, month, userId),
      ReportService.getMonthTotals(year, month === 1 ? 12 : month - 1, userId),
    ]);

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];

    const monthName = monthNames[month - 1];
    const daysElapsed = now.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthProgress = Math.round((daysElapsed / daysInMonth) * 100);

    let msg = `📊 *Resumo Semanal — ${monthName}*\n`;
    msg += `📅 Dia ${daysElapsed}/${daysInMonth} (${monthProgress}% do mês)\n`;
    msg += `━━━━━━━━\n\n`;

    msg += `📈 Receitas: R$ ${currentTotals.totalIncome.toFixed(2)}\n`;
    msg += `📉 Despesas: R$ ${currentTotals.totalExpense.toFixed(2)}\n`;

    const balanceEmoji = currentTotals.balance >= 0 ? '🤑' : '😰';
    const balanceSign = currentTotals.balance >= 0 ? '+' : '-';
    msg += `${balanceEmoji} Saldo: ${balanceSign} R$ ${Math.abs(currentTotals.balance).toFixed(2)}\n`;

    // Comparação com mês anterior
    if (prevMonth.totalExpense > 0) {
      const expenseDiff = currentTotals.totalExpense - prevMonth.totalExpense;
      const expensePct = Math.abs(Math.round((expenseDiff / prevMonth.totalExpense) * 100));
      const trend = expenseDiff > 0 ? `📈 +${expensePct}%` : `📉 -${expensePct}%`;
      msg += `\n🔄 *vs mês anterior:*\n`;
      msg += `  Despesas: ${trend} (R$ ${Math.abs(expenseDiff).toFixed(2)} ${expenseDiff > 0 ? 'a mais' : 'a menos'})\n`;
    }

    // Verifica orçamentos críticos
    const currentMonthKey = `${year}-${String(month).padStart(2, '0')}`;
    const budgets = await CategoryBudgetRepository.findByUserAndMonth(userId, currentMonthKey);
    const criticalBudgets = [];

    for (const budget of budgets) {
      const spent = await CategoryBudgetRepository.getSpentByCategory(userId, budget.category_id, currentMonthKey);
      const limit = parseFloat(budget.amount);
      if (limit > 0) {
        const pct = (spent / limit) * 100;
        if (pct >= 80) {
          criticalBudgets.push({ name: budget.category?.name || '—', pct: Math.round(pct), spent, limit });
        }
      }
    }

    if (criticalBudgets.length > 0) {
      msg += `\n⚠️ *Orçamentos em alerta:*\n`;
      for (const b of criticalBudgets) {
        const statusEmoji = b.pct >= 100 ? '🚨' : '⚠️';
        msg += `  ${statusEmoji} ${b.name}: ${b.pct}% (R$ ${b.spent.toFixed(2)}/${b.limit.toFixed(2)})\n`;
      }
    }

    // Dica personalizada baseada no saldo
    msg += `\n💡 *Dica:*\n`;
    if (currentTotals.balance < 0) {
      msg += `  Seus gastos superaram as receitas neste mês. Considere revisar despesas variáveis.`;
    } else if (monthProgress >= 50 && currentTotals.totalExpense > currentTotals.totalIncome * 0.8) {
      msg += `  Você já usou ${Math.round((currentTotals.totalExpense / currentTotals.totalIncome) * 100)}% das receitas. Atenção ao fim do mês!`;
    } else {
      msg += `  Você está no caminho certo! Continue registrando suas transações para manter o controle.`;
    }

    msg += `\n\n_Para detalhes, envie *5* no menu._`;
    return msg;
  }

  // Gera insight contextual após lançar uma transação de despesa
  async generatePostTransactionInsight(userId, categoryId, amount) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
      const budget = await CategoryBudgetRepository.findOne(userId, categoryId, month);
      if (!budget) return null;

      const spent = await CategoryBudgetRepository.getSpentByCategory(userId, categoryId, month);
      const limit = parseFloat(budget.amount);
      if (limit <= 0) return null;

      const pct = (spent / limit) * 100;
      const categoryName = budget.category?.name || 'categoria';

      if (pct >= 100) {
        return (
          `🚨 *Orçamento esgotado!*\n` +
          `${categoryName}: R$ ${spent.toFixed(2)} / R$ ${limit.toFixed(2)} (${Math.round(pct)}%)\n` +
          `_Considere revisar seus gastos nesta categoria._`
        );
      }
      if (pct >= 80) {
        return (
          `⚠️ *Atenção: ${Math.round(pct)}% do orçamento de ${categoryName} usado!*\n` +
          `R$ ${spent.toFixed(2)} de R$ ${limit.toFixed(2)} — restam R$ ${(limit - spent).toFixed(2)}.`
        );
      }
    } catch (err) {
      // silently ignore
    }
    return null;
  }
}

module.exports = new InsightsService();
