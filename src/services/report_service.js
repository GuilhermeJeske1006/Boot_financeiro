const TransactionService = require('./transaction_service');

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

class ReportService {
  async getMonthTotals(year, month, userId) {
    const summary = await TransactionService.getMonthSummary(year, month, userId);
    let totalIncome = 0;
    let totalExpense = 0;
    for (const row of summary) {
      const amount = parseFloat(row.total);
      if (row.type === 'income') totalIncome += amount;
      else totalExpense += amount;
    }
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }

  async generateMonthlyReport(year, month, userId, prevTotals = null) {
    const summary = await TransactionService.getMonthSummary(year, month, userId);

    let totalIncome = 0;
    let totalExpense = 0;
    const incomeByCategory = [];
    const expenseByCategory = [];

    for (const row of summary) {
      const amount = parseFloat(row.total);
      if (row.type === 'income') {
        totalIncome += amount;
        incomeByCategory.push({ category: row.category_name, total: amount });
      } else {
        totalExpense += amount;
        expenseByCategory.push({ category: row.category_name, total: amount });
      }
    }

    const balance = totalIncome - totalExpense;

    let report = `📊 *Relatório Financeiro*\n`;
    report += `👤 Pessoal\n`;
    report += `🗓️ *${MONTH_NAMES[month - 1]}/${year}*\n`;
    report += `━━━━━━━━\n\n`;

    report += `💚 *Entradas (Receitas):*\n`;
    if (incomeByCategory.length === 0) {
      report += `  😶 Nenhuma entrada registrada\n`;
    } else {
      for (const item of incomeByCategory) {
        report += `  📈 ${item.category}: R$ ${item.total.toFixed(2)}\n`;
      }
    }
    report += `  💰 *Total: R$ ${totalIncome.toFixed(2)}*\n\n`;

    report += `🔴 *Saídas (Despesas):*\n`;
    if (expenseByCategory.length === 0) {
      report += `  😶 Nenhuma saída registrada\n`;
    } else {
      for (const item of expenseByCategory) {
        report += `  📉 ${item.category}: R$ ${item.total.toFixed(2)}\n`;
      }
    }
    report += `  💸 *Total: R$ ${totalExpense.toFixed(2)}*\n\n`;

    report += `━━━━━━━━\n`;
    const emoji = balance >= 0 ? '🤑' : '😰';
    const sign = balance >= 0 ? '+' : '-';
    report += `${emoji} *Saldo do mês: ${sign} R$ ${Math.abs(balance).toFixed(2)}*\n`;

    if (prevTotals && (prevTotals.totalIncome + prevTotals.totalExpense) > 0) {
      const diffIncome = totalIncome - prevTotals.totalIncome;
      const diffExpense = totalExpense - prevTotals.totalExpense;
      const diffBalance = balance - prevTotals.balance;

      const fmt = (diff) => `${diff >= 0 ? '+' : '-'} R$ ${Math.abs(diff).toFixed(2)}`;
      const trend = (diff) => diff >= 0 ? '📈' : '📉';

      report += `\n📅 *Comparação com mês anterior:*\n`;
      report += `  ${trend(diffIncome)} Receitas: ${fmt(diffIncome)}\n`;
      report += `  ${trend(-diffExpense)} Despesas: ${fmt(diffExpense)}\n`;
      report += `  ${trend(diffBalance)} Saldo: ${fmt(diffBalance)}\n`;
    }

    return report;
  }
}

module.exports = new ReportService();
