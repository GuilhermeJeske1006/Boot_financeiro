const TransactionRepository = require('../../repositories/transaction_repository');

class RecentTransactionsMenu {
  async show(userId) {
    const transactions = await TransactionRepository.findRecentForUser(userId, 10);

    let msg = `🕐 *Últimas Transações*\n\n`;

    if (transactions.length === 0) {
      msg += `😶 Nenhuma transação encontrada.\n\n`;
      msg += `_Registre uma transação pelo menu ou use /e ou /r._`;
      return msg;
    }

    msg += `*Últimas 10 lançamentos:*\n\n`;
    for (const tx of transactions) {
      const emoji = tx.type === 'income' ? '📈' : '📉';
      const date = new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR');
      const categoryName = tx.category?.name || '—';
      const companyName = tx.company ? ` [${tx.company.name}]` : '';
      const desc = tx.description ? ` — ${tx.description}` : '';
      msg += `  ${emoji} *R$ ${parseFloat(tx.amount).toFixed(2)}* ➜ ${categoryName}${companyName}${desc}\n`;
      msg += `       📅 ${date}\n`;
    }

    msg += `\n🔙 *0* ➜ Voltar ao menu`;
    return msg;
  }
}

module.exports = new RecentTransactionsMenu();
