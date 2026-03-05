const GoalService = require('../../services/goal_service');

function _progressBar(current, target, width = 10) {
  const pct = Math.min(current / target, 1);
  const filled = Math.round(pct * width);
  return '▓'.repeat(filled) + '░'.repeat(width - filled);
}

class GoalMenu {
  async showMain(userId) {
    const goals = await GoalService.listByUser(userId);

    let msg = `🎯 *Metas Financeiras*\n\n`;

    if (goals.length === 0) {
      msg += `😶 Nenhuma meta ativa.\n\n`;
    } else {
      for (const goal of goals) {
        const current = parseFloat(goal.current_amount);
        const target = parseFloat(goal.target_amount);
        const pct = Math.min(Math.round((current / target) * 100), 100);
        const bar = _progressBar(current, target);
        const deadline = goal.deadline
          ? `📅 Prazo: ${new Date(goal.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}\n  `
          : '';
        msg += `💰 *${goal.name}*\n`;
        msg += `  ${bar} ${pct}%\n`;
        msg += `  R$ ${current.toFixed(2)} / R$ ${target.toFixed(2)}\n`;
        msg += `  ${deadline}\n`;
      }
    }

    msg += `━━━━━━━━\n`;
    msg += `*1* ➜ Nova meta\n`;
    if (goals.length > 0) {
      msg += `*2* ➜ Contribuir para meta\n`;
      msg += `*3* ➜ Cancelar meta\n`;
    }
    msg += `*0* ➜ Voltar\n\n`;
    msg += `_Digite o número da opção_ ✍️`;

    return { message: msg, goals };
  }

  async handleStep(state, input, userId) {
    if (input === '0') return { done: true, message: '' };

    switch (state.step) {
      case 1:
        return await this._handleMainOption(state, input, userId);
      case 2:
        return await this._handleStep2(state, input, userId);
      case 3:
        return await this._handleStep3(state, input, userId);
      case 4:
        return await this._handleStep4(state, input, userId);
      case 5:
        return await this._handleStep5(state, input, userId);
      default:
        return { done: true, message: '' };
    }
  }

  async _handleMainOption(state, input, userId) {
    const { goals } = state.data;

    if (input === '1') {
      return {
        newState: { ...state, step: 2, data: { ...state.data, flow: 'create' } },
        message: `🎯 *Nova Meta*\n\nDigite o *nome* da meta:\nEx: Viagem, Reserva de emergência, Notebook`,
      };
    }

    if (input === '2' && goals && goals.length > 0) {
      let msg = `💰 *Contribuir para meta*\n\nEscolha a meta:\n\n`;
      goals.forEach((g, i) => {
        const current = parseFloat(g.current_amount);
        const target = parseFloat(g.target_amount);
        const pct = Math.round((current / target) * 100);
        msg += `  *${i + 1}* ➜ ${g.name} (${pct}%)\n`;
      });
      msg += `\n_Digite o número da meta_ ✍️`;
      return {
        newState: { ...state, step: 2, data: { ...state.data, flow: 'contribute' } },
        message: msg,
      };
    }

    if (input === '3' && goals && goals.length > 0) {
      let msg = `🗑️ *Cancelar meta*\n\nEscolha a meta:\n\n`;
      goals.forEach((g, i) => {
        msg += `  *${i + 1}* ➜ ${g.name}\n`;
      });
      msg += `\n_Digite o número da meta_ ✍️`;
      return {
        newState: { ...state, step: 2, data: { ...state.data, flow: 'cancel' } },
        message: msg,
      };
    }

    const { message, goals: refreshed } = await this.showMain(userId);
    return { newState: { ...state, step: 1, data: { ...state.data, goals: refreshed } }, message };
  }

  async _handleStep2(state, input, userId) {
    const { flow, goals } = state.data;

    if (flow === 'create') {
      if (!input || input.trim() === '') {
        return { newState: state, message: '⚠️ Nome não pode ser vazio. Digite o nome da meta:' };
      }
      return {
        newState: { ...state, step: 3, data: { ...state.data, goalName: input.trim() } },
        message: `✅ Nome: *${input.trim()}*\n\n💲 Digite o *valor alvo* (ex: 5000 ou 1500.50):`,
      };
    }

    if (flow === 'contribute' || flow === 'cancel') {
      const idx = parseInt(input) - 1;
      if (isNaN(idx) || idx < 0 || idx >= goals.length) {
        return { newState: state, message: `⚠️ Opção inválida. Digite um número de 1 a ${goals.length}.` };
      }
      const selected = goals[idx];

      if (flow === 'cancel') {
        await GoalService.cancel(selected.id, userId);
        return { done: true, message: `✅ Meta *${selected.name}* cancelada.` };
      }

      return {
        newState: { ...state, step: 3, data: { ...state.data, selectedGoal: selected } },
        message: `💰 *${selected.name}*\n\nDigite o *valor* da contribuição (ex: 200):`,
      };
    }

    return { done: true, message: '' };
  }

  async _handleStep3(state, input, userId) {
    const { flow } = state.data;

    if (flow === 'create') {
      const amount = parseFloat(input.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        return { newState: state, message: '⚠️ Valor inválido. Digite um número positivo (ex: 5000):' };
      }
      return {
        newState: { ...state, step: 4, data: { ...state.data, targetAmount: amount } },
        message: `✅ Valor: *R$ ${amount.toFixed(2)}*\n\n📅 Digite o prazo no formato DD/MM/AAAA\n(ou *pular* para sem prazo definido):`,
      };
    }

    if (flow === 'contribute') {
      const amount = parseFloat(input.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        return { newState: state, message: '⚠️ Valor inválido. Digite um número positivo:' };
      }
      const { selectedGoal } = state.data;
      const updated = await GoalService.contribute(selectedGoal.id, userId, amount);
      const current = parseFloat(updated.current_amount);
      const target = parseFloat(updated.target_amount);
      const pct = Math.min(Math.round((current / target) * 100), 100);
      const bar = _progressBar(current, target);
      const completed = updated.status === 'completed';

      let msg = `✅ *Contribuição registrada!*\n\n`;
      msg += `💰 R$ ${amount.toFixed(2)} adicionados à meta *${updated.name}*\n\n`;
      msg += `${bar} ${pct}%\n`;
      msg += `R$ ${current.toFixed(2)} / R$ ${target.toFixed(2)}\n`;
      if (completed) msg += `\n🎉 *Parabéns! Meta atingida!*`;
      return { done: true, message: msg };
    }

    return { done: true, message: '' };
  }

  async _handleStep4(state, input, userId) {
    // Prazo da nova meta
    let deadline = null;
    if (input.toLowerCase() !== 'pular') {
      const parts = input.split('/');
      if (parts.length !== 3) {
        return { newState: state, message: '⚠️ Formato inválido. Use DD/MM/AAAA ou *pular*:' };
      }
      const [d, m, y] = parts.map(Number);
      const date = new Date(y, m - 1, d);
      if (isNaN(date.getTime())) {
        return { newState: state, message: '⚠️ Data inválida. Use DD/MM/AAAA ou *pular*:' };
      }
      deadline = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    const { goalName, targetAmount } = state.data;
    const deadlineLabel = deadline
      ? new Date(deadline + 'T12:00:00').toLocaleDateString('pt-BR')
      : 'Sem prazo';

    let msg = `📋 *Resumo da Meta:*\n\n`;
    msg += `🎯 Nome: ${goalName}\n`;
    msg += `💲 Valor alvo: R$ ${targetAmount.toFixed(2)}\n`;
    msg += `📅 Prazo: ${deadlineLabel}\n\n`;
    msg += `✅ *S* para confirmar | ❌ *N* para cancelar`;

    return {
      newState: { ...state, step: 5, data: { ...state.data, deadline } },
      message: msg,
    };
  }

  async _handleStep5(state, input, userId) {
    if (input.toUpperCase() === 'S') {
      const { goalName, targetAmount, deadline } = state.data;
      await GoalService.create(userId, goalName, targetAmount, deadline);
      return { done: true, message: `🎉 *Meta criada com sucesso!*\n\n🎯 ${goalName} — R$ ${targetAmount.toFixed(2)}` };
    }
    return { done: true, message: '❌ Criação de meta cancelada.' };
  }
}

module.exports = new GoalMenu();
