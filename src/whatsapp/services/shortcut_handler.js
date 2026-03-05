const TransactionService = require('../../services/transaction_service');
const CategoryRepository = require('../../repositories/category_repository');
const ReportService = require('../../services/report_service');

class ShortcutHandler {
  async handle(userId, input) {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) return null;

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === '/saldo') return await this._handleSaldo(userId);
    if (cmd === '/e' || cmd === '/r') return await this._handleTransaction(userId, cmd, parts.slice(1));
    if (cmd === '/ajuda') return this._handleHelp();

    return null;
  }

  async _handleSaldo(userId) {
    const now = new Date();
    const totals = await ReportService.getMonthTotals(now.getFullYear(), now.getMonth() + 1, userId);
    const emoji = totals.balance >= 0 ? '🤑' : '😰';
    const sign = totals.balance >= 0 ? '+' : '-';
    return [
      `💰 *Saldo do Mês*`,
      ``,
      `📈 Receitas: R$ ${totals.totalIncome.toFixed(2)}`,
      `📉 Despesas: R$ ${totals.totalExpense.toFixed(2)}`,
      `━━━━━━━━`,
      `${emoji} Saldo: ${sign} R$ ${Math.abs(totals.balance).toFixed(2)}`,
      ``,
      `_Para detalhes, envie *5* no menu._`,
    ].join('\n');
  }

  async _handleTransaction(userId, cmd, args) {
    const type = cmd === '/e' ? 'expense' : 'income';
    const typeLabel = type === 'income' ? 'Entrada' : 'Saída';
    const exampleCmd = type === 'income' ? '/r 3000 salário' : '/e 50 alimentação';

    if (args.length < 1) {
      return `⚠️ *Uso:* ${cmd} <valor> [categoria]\nEx: ${exampleCmd}`;
    }

    const amountStr = args[0].replace(',', '.');
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return `⚠️ Valor inválido. Ex: ${exampleCmd}`;
    }

    const categorySearch = args.slice(1).join(' ').trim().toLowerCase();
    const categories = await CategoryRepository.findByType(type, userId);

    let category = null;
    if (categorySearch) {
      category = categories.find(c => c.name.toLowerCase().includes(categorySearch));
      if (!category) {
        const list = categories.map(c => `  • ${c.name}`).join('\n');
        return `⚠️ Categoria "*${categorySearch}*" não encontrada.\n\nDisponíveis:\n${list}`;
      }
    } else if (categories.length > 0) {
      category = categories[0];
    }

    if (!category) {
      return '⚠️ Nenhuma categoria encontrada. Acesse o menu para criar categorias.';
    }

    const today = new Date().toISOString().split('T')[0];
    await TransactionService.create({
      type,
      amount,
      category_id: category.id,
      user_id: userId,
      date: today,
    });

    const typeEmoji = type === 'income' ? '📈' : '📉';
    return [
      `✅ *${typeLabel} registrada!*`,
      ``,
      `${typeEmoji} R$ ${amount.toFixed(2)}`,
      `🏷️ Categoria: ${category.name}`,
      `📅 Data: ${new Date().toLocaleDateString('pt-BR')}`,
      ``,
      `💡 _Atalhos: /e <valor> [cat] | /r <valor> [cat] | /saldo_`,
    ].join('\n');
  }

  _handleHelp() {
    return [
      `⚡ *Atalhos Rápidos*`,
      ``,
      `*/e <valor> [categoria]*`,
      `  Registra uma saída (despesa)`,
      `  Ex: /e 50 alimentação`,
      ``,
      `*/r <valor> [categoria]*`,
      `  Registra uma entrada (receita)`,
      `  Ex: /r 3000 salário`,
      ``,
      `*/saldo*`,
      `  Mostra o saldo do mês atual`,
      ``,
      `*/ajuda*`,
      `  Mostra este menu de ajuda`,
      ``,
      `_Para mais opções, envie qualquer mensagem._`,
    ].join('\n');
  }
}

module.exports = new ShortcutHandler();
