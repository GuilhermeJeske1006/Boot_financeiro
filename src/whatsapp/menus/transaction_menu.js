const CategoryService = require('../../services/category_service');
const TransactionService = require('../../services/transaction_service');

class TransactionMenu {
  async startFlow(type, userId) {
    const label = type === 'income' ? '📈 Entrada' : '📉 Saída';
    const emoji = type === 'income' ? '💚' : '🔴';
    const categories = await CategoryService.findByType(type, userId);

    let msg = `${label}\n\n`;
    msg += `🏷️ Escolha a categoria:\n\n`;
    categories.forEach((cat, index) => {
      msg += `  ${emoji} *${index + 1}* ➜ ${cat.name}\n`;
    });
    msg += `\n_Digite o número da categoria_ ✍️`;

    return msg;
  }

  async handleStep(state, input, userId) {
    switch (state.step) {
      case 1:
        return await this._handleCategorySelection(state, input, userId);
      case 2:
        return this._handleAmount(state, input);
      case 3:
        return this._handleDescription(state, input);
      case 4:
        return this._handleDate(state, input);
      case 5:
        return await this._handleConfirmation(state, input, userId);
      default:
        return { done: true, message: '❌ Fluxo inválido.' };
    }
  }

  async _handleCategorySelection(state, input, userId) {
    const categories = await CategoryService.findByType(state.data.type, userId);
    const index = parseInt(input) - 1;

    if (isNaN(index) || index < 0 || index >= categories.length) {
      return {
        newState: state,
        message: `⚠️ Opção inválida. Digite um número de 1 a ${categories.length}.`,
      };
    }

    const selected = categories[index];
    const newState = {
      ...state,
      step: 2,
      data: { ...state.data, category_id: selected.id, category_name: selected.name },
    };

    return {
      newState,
      message: `✅ Categoria: *${selected.name}*\n\n💲 Agora digite o *valor* (ex: 150.00 ou 150):`,
    };
  }

  _handleAmount(state, input) {
    const normalized = input.replace(',', '.');
    const amount = parseFloat(normalized);

    if (isNaN(amount) || amount <= 0) {
      return {
        newState: state,
        message: '⚠️ Valor inválido. Digite um número positivo (ex: 150.00):',
      };
    }

    const newState = {
      ...state,
      step: 3,
      data: { ...state.data, amount },
    };

    return {
      newState,
      message: `✅ Valor: *R$ ${amount.toFixed(2)}*\n\n📝 Digite uma *descrição* (ou digite *pular* para deixar em branco):`,
    };
  }

  _handleDescription(state, input) {
    const description = input.toLowerCase() === 'pular' ? null : input;
    const newState = {
      ...state,
      step: 4,
      data: { ...state.data, description },
    };

    return {
      newState,
      message: `📅 Digite a *data* no formato DD/MM/AAAA\n(ou *pular* para usar a data de hoje):`,
    };
  }

  _handleDate(state, input) {
    let date;
    if (input.toLowerCase() === 'pular') {
      date = new Date();
    } else {
      const parts = input.split('/');
      if (parts.length !== 3) {
        return { newState: state, message: '⚠️ Formato inválido. Use DD/MM/AAAA (ex: 15/01/2026):' };
      }
      const [day, month, year] = parts.map(Number);
      date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) {
        return { newState: state, message: '⚠️ Data inválida. Use DD/MM/AAAA (ex: 15/01/2026):' };
      }
    }

    const dateStr = date.toLocaleDateString('pt-BR');
    const newState = {
      ...state,
      step: 5,
      data: { ...state.data, date },
    };

    const typeLabel = state.data.type === 'income' ? '📈 Entrada' : '📉 Saída';
    const emoji = state.data.type === 'income' ? '💚' : '🔴';

    let summary = `${emoji} *Resumo da ${typeLabel}:*\n`;
    summary += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    summary += `🏷️ Categoria: ${state.data.category_name}\n`;
    summary += `💲 Valor: R$ ${state.data.amount.toFixed(2)}\n`;
    summary += `📝 Descrição: ${state.data.description || '(sem descrição)'}\n`;
    summary += `📅 Data: ${dateStr}\n\n`;
    summary += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    summary += `✅ *S* para confirmar\n`;
    summary += `❌ *N* para cancelar`;

    return { newState, message: summary };
  }

  async _handleConfirmation(state, input, userId) {
    if (input.toUpperCase() === 'S') {
      await TransactionService.create({
        type: state.data.type,
        amount: state.data.amount,
        description: state.data.description,
        category_id: state.data.category_id,
        user_id: userId,
        date: state.data.date,
      });
      const typeLabel = state.data.type === 'income' ? 'Entrada' : 'Saída';
      return { done: true, message: `🎉✅ ${typeLabel} registrada com sucesso!` };
    } else {
      return { done: true, message: '❌ Operação cancelada.' };
    }
  }
}

module.exports = new TransactionMenu();
