const TransactionRepository = require('../../repositories/transaction_repository');
const TransactionService = require('../../services/transaction_service');

class EditTransactionMenu {
  async showTransactions(userId) {
    const transactions = await TransactionRepository.findRecentForUser(userId, 10);

    if (transactions.length === 0) {
      return { message: '📭 Nenhuma transação encontrada.', transactions: [] };
    }

    let msg = `✏️ *Editar Transação*\n\nSelecione a transação:\n\n`;
    transactions.forEach((t, i) => {
      const sign = t.type === 'income' ? '📈' : '📉';
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      const amount = Number(t.amount).toFixed(2).replace('.', ',');
      const company = t.company ? ` [${t.company.name}]` : '';
      msg += `*${i + 1}* ${sign} R$ ${amount} — ${t.category?.name || '—'}${company} (${date})\n`;
      if (t.description) msg += `   _${t.description}_\n`;
    });
    msg += `\n*0* ➜ Cancelar\n\n_Digite o número da transação_ ✍️`;

    return { message: msg, transactions };
  }

  async handleStep(state, input, userId) {
    const { step, data } = state;

    if (input === '0') return { done: true, message: '❌ Edição cancelada.' };

    if (step === 1) {
      const idx = parseInt(input) - 1;
      if (isNaN(idx) || idx < 0 || idx >= (data.transactions || []).length) {
        return {
          done: false,
          newState: state,
          message: '⚠️ Opção inválida. Digite o número da transação ou *0* para cancelar.',
        };
      }
      const transaction = data.transactions[idx];
      const sign = transaction.type === 'income' ? '📈' : '📉';
      const oldAmount = Number(transaction.amount).toFixed(2).replace('.', ',');
      return {
        done: false,
        newState: { ...state, step: 2, data: { ...data, selectedTransaction: transaction } },
        message:
          `✏️ Transação selecionada:\n\n` +
          `${sign} R$ ${oldAmount} — ${transaction.category?.name || '—'}\n` +
          (transaction.description ? `_${transaction.description}_\n` : '') +
          `\nDigite o *novo valor* ou *0* para cancelar ✍️`,
      };
    }

    if (step === 2) {
      const amount = parseFloat(input.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        return {
          done: false,
          newState: state,
          message: '⚠️ Valor inválido. Digite um número positivo (ex: 150,00) ou *0* para cancelar.',
        };
      }
      const oldAmount = Number(data.selectedTransaction.amount).toFixed(2).replace('.', ',');
      const newAmount = amount.toFixed(2).replace('.', ',');
      return {
        done: false,
        newState: { ...state, step: 3, data: { ...data, newAmount: amount } },
        message:
          `❓ Confirmar alteração?\n\n` +
          `📉 De: R$ ${oldAmount}\n` +
          `📈 Para: R$ ${newAmount}\n\n` +
          `✅ *S* para confirmar\n❌ *N* para cancelar`
      };
    }

    if (step === 3) {
      if (input.toUpperCase() === 'S') {
        await TransactionService.update(
          data.selectedTransaction.id,
          { amount: data.newAmount },
          userId
        );
        return { done: true, message: '✅ Transação atualizada com sucesso!' };
      }
      return { done: true, message: '❌ Edição cancelada.' };
    }

    return { done: true, message: '' };
  }
}

module.exports = new EditTransactionMenu();
