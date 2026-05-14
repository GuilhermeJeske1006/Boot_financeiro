const CategoryBudgetService = require('../../services/category_budget_service');
const CategoryBudgetRepository = require('../../repositories/category_budget_repository');
const CategoryService = require('../../services/category_service');

class BudgetMenu {
  _currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  _monthLabel() {
    return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  _progressBar(pct) {
    const capped = Math.min(pct, 100);
    const filled = Math.round(capped / 10);
    const empty = 10 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
  }

  async showMain(userId) {
    const month = this._currentMonth();
    const budgets = await CategoryBudgetRepository.findByUserAndMonth(userId, month);

    const spentList = await Promise.all(
      budgets.map(b => CategoryBudgetRepository.getSpentByCategory(userId, b.category_id, month))
    );

    let msg = `🎯 *Metas e Orçamentos*\n`;
    msg += `📅 ${this._monthLabel()}\n\n`;

    if (budgets.length === 0) {
      msg += `_Nenhum orçamento definido para este mês._\n\n`;
    } else {
      budgets.forEach((budget, i) => {
        const limit = parseFloat(budget.amount);
        const spent = spentList[i];
        const pct = limit > 0 ? (spent / limit) * 100 : 0;
        const bar = this._progressBar(pct);
        const statusEmoji = pct >= 100 ? '🚨' : pct >= 80 ? '⚠️' : '✅';
        msg += `${statusEmoji} *${budget.category?.name || '—'}*\n`;
        msg += `   ${bar} ${pct.toFixed(0)}%\n`;
        msg += `   R$ ${spent.toFixed(2)} / R$ ${limit.toFixed(2)}\n\n`;
      });
    }

    msg += `1️⃣ ➜ Definir/Editar orçamento\n`;
    if (budgets.length > 0) {
      msg += `2️⃣ ➜ Remover orçamento\n`;
    }
    msg += `0️⃣ ➜ Voltar\n`;
    msg += `\n_Digite o número da opção_ ✍️`;

    return { message: msg, budgets };
  }

  async handleStep(state, input, userId) {
    if (input === '0') {
      return { done: true, message: '' };
    }

    switch (state.step) {
      case 1:
        return await this._handleMainOption(state, input, userId);
      case 2:
        return await this._handleStep2(state, input, userId);
      case 3:
        return await this._handleStep3(state, input, userId);
      case 4:
        return await this._handleConfirmation(state, input, userId);
      default:
        return { done: true, message: '❌ Fluxo inválido.' };
    }
  }

  async _handleMainOption(state, input, userId) {
    if (input === '1') {
      // Define budget: show expense categories
      const categories = await CategoryService.findByType('expense', userId);
      if (categories.length === 0) {
        return {
          newState: state,
          message: '⚠️ Você não possui categorias de despesa cadastradas.',
        };
      }
      let msg = `🏷️ Escolha a categoria para definir o orçamento:\n\n`;
      categories.forEach((cat, i) => {
        msg += `  🔴 *${i + 1}* ➜ ${cat.name}\n`;
      });
      msg += `\n_Digite o número da categoria_ ✍️\n`;
      msg += `\n🔙 *0* ➜ Voltar`;
      return {
        newState: { ...state, step: 2, data: { ...state.data, subflow: 'define', categories } },
        message: msg,
      };
    }

    if (input === '2' && state.data.budgets && state.data.budgets.length > 0) {
      // Remove budget: show existing budgets
      const budgets = state.data.budgets;
      let msg = `🗑️ Qual orçamento deseja remover?\n\n`;
      budgets.forEach((b, i) => {
        msg += `  ❌ *${i + 1}* ➜ ${b.category?.name || '—'} (R$ ${parseFloat(b.amount).toFixed(2)})\n`;
      });
      msg += `\n_Digite o número_ ✍️\n`;
      msg += `\n🔙 *0* ➜ Voltar`;
      return {
        newState: { ...state, step: 2, data: { ...state.data, subflow: 'remove' } },
        message: msg,
      };
    }

    // Invalid option: re-show main
    const { message, budgets } = await this.showMain(userId);
    return {
      newState: { ...state, step: 1, data: { ...state.data, budgets } },
      message,
    };
  }

  async _handleStep2(state, input, userId) {
    const { subflow, categories, budgets } = state.data;

    if (subflow === 'define') {
      const index = parseInt(input) - 1;
      if (isNaN(index) || index < 0 || index >= categories.length) {
        return {
          newState: state,
          message: `⚠️ Opção inválida. Digite um número de 1 a ${categories.length}.`,
        };
      }
      const selected = categories[index];
      return {
        newState: {
          ...state,
          step: 3,
          data: { ...state.data, category_id: selected.id, category_name: selected.name },
        },
        message: `✅ Categoria: *${selected.name}*\n\n💲 Digite o *limite mensal* (ex: 800 ou 800.00):`,
      };
    }

    if (subflow === 'remove') {
      const index = parseInt(input) - 1;
      if (isNaN(index) || index < 0 || index >= budgets.length) {
        return {
          newState: state,
          message: `⚠️ Opção inválida. Digite um número de 1 a ${budgets.length}.`,
        };
      }
      const selected = budgets[index];
      return {
        newState: {
          ...state,
          step: 3,
          data: { ...state.data, budget_id: selected.id, budget_category_name: selected.category?.name || '—' },
        },
        message: (
          `Tem certeza que deseja remover o orçamento de *${selected.category?.name || '—'}*?\n\n` +
          `✅ *S* para confirmar\n❌ *N* para cancelar`
        ),
      };
    }

    return { done: true, message: '❌ Fluxo inválido.' };
  }

  async _handleStep3(state, input, userId) {
    const { subflow } = state.data;

    if (subflow === 'define') {
      const normalized = input.replace(',', '.');
      const amount = parseFloat(normalized);
      if (isNaN(amount) || amount <= 0) {
        return {
          newState: state,
          message: '⚠️ Valor inválido. Digite um número positivo (ex: 800.00):',
        };
      }
      const { category_name } = state.data;
      return {
        newState: { ...state, step: 4, data: { ...state.data, amount } },
        message: (
          `📋 *Confirmar orçamento:*\n\n` +
          `🏷️ Categoria: *${category_name}*\n` +
          `💲 Limite mensal: *R$ ${amount.toFixed(2)}*\n\n` +
          `✅ *S* para confirmar\n❌ *N* para cancelar`
        ),
      };
    }

    if (subflow === 'remove') {
      if (input.toUpperCase() === 'S') {
        await CategoryBudgetService.delete(state.data.budget_id, userId);
        return {
          done: true,
          message: `✅ Orçamento de *${state.data.budget_category_name}* removido com sucesso!`,
        };
      }
      return { done: true, message: '❌ Operação cancelada.' };
    }

    return { done: true, message: '❌ Fluxo inválido.' };
  }

  async _handleConfirmation(state, input, userId) {
    if (input.toUpperCase() === 'S') {
      await CategoryBudgetService.upsert(userId, state.data.category_id, state.data.amount);
      return {
        done: true,
        message: `🎉 Orçamento de *R$ ${state.data.amount.toFixed(2)}* definido para *${state.data.category_name}* este mês!`,
      };
    }
    return { done: true, message: '❌ Operação cancelada.' };
  }
}

module.exports = new BudgetMenu();
