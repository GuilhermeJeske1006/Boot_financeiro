const UserRepository = require('../../repositories/user_respository');

class LLMMenu {
  async showMain(userId) {
    const user = await UserRepository.findById(userId);
    const statusEmoji = user.ai_enabled ? '✅' : '❌';
    const statusLabel = user.ai_enabled ? 'Ativada' : 'Desativada';
    const contextLabel =
      user.ai_context_length === 0
        ? 'Sem histórico'
        : `${user.ai_context_length} mensagens anteriores`;

    let msg = `🤖 *Configurações de IA*\n\n`;
    msg += `Status: ${statusEmoji} ${statusLabel}\n`;
    msg += `Contexto: ${contextLabel}\n\n`;
    msg += `*1* ➜ Ativar/Desativar IA\n`;
    msg += `*2* ➜ Histórico de contexto\n`;
    msg += `*0* ➜ Voltar\n\n`;
    msg += `_Digite o número da opção_ ✍️`;
    return { message: msg, user };
  }

  async handleStep(state, input, userId) {
    if (input.toLowerCase() === 'sair') {
      return { done: true, message: '🔚 Sessão finalizada.' };
    }

    switch (state.step) {
      case 1: {
        if (input === '0') return { done: true, message: '' };
        if (input === '1') {
          const user = await UserRepository.findById(userId);
          const newStatus = user.ai_enabled ? 'desativar' : 'ativar';
          const currentLabel = user.ai_enabled ? '✅ Ativada' : '❌ Desativada';
          return {
            newState: { ...state, step: 2, data: { action: 'toggle' } },
            message:
              `IA atualmente: *${currentLabel}*\n\n` +
              `Deseja *${newStatus}* o interpretador de linguagem natural?\n\n` +
              `✅ *S* para confirmar\n❌ *N* para cancelar`,
          };
        }
        if (input === '2') {
          const user = await UserRepository.findById(userId);
          const current = user.ai_context_length;
          let msg = `🔢 *Histórico de Contexto*\n\n`;
          msg += `Atual: ${current === 0 ? 'Sem histórico' : `${current} mensagens`}\n\n`;
          msg += `Quantas mensagens anteriores a IA deve considerar?\n\n`;
          msg += `*1* ➜ 0 — Sem histórico\n`;
          msg += `*2* ➜ 3 mensagens\n`;
          msg += `*3* ➜ 5 mensagens\n`;
          msg += `*4* ➜ 10 mensagens\n`;
          msg += `*0* ➜ Voltar\n\n`;
          msg += `_Digite o número da opção_ ✍️`;
          return {
            newState: { ...state, step: 3, data: { action: 'context' } },
            message: msg,
          };
        }
        const { message } = await this.showMain(userId);
        return { newState: state, message };
      }

      case 2: {
        // toggle ai_enabled
        if (input.toUpperCase() === 'S') {
          const user = await UserRepository.findById(userId);
          const newValue = !user.ai_enabled;
          await UserRepository.update(userId, { ai_enabled: newValue });
          const label = newValue ? '✅ ativada' : '❌ desativada';
          return { done: true, message: `🤖 IA ${label} com sucesso!` };
        }
        return { done: true, message: '❌ Operação cancelada.' };
      }

      case 3: {
        // context length selection
        const map = { '1': 0, '2': 3, '3': 5, '4': 10 };
        if (input === '0') {
          const { message } = await this.showMain(userId);
          return { newState: { ...state, step: 1, data: {} }, message };
        }
        if (!map.hasOwnProperty(input)) {
          const user = await UserRepository.findById(userId);
          const current = user.ai_context_length;
          let msg = `🔢 *Histórico de Contexto*\n\n`;
          msg += `Atual: ${current === 0 ? 'Sem histórico' : `${current} mensagens`}\n\n`;
          msg += `Quantas mensagens anteriores a IA deve considerar?\n\n`;
          msg += `*1* ➜ 0 — Sem histórico\n`;
          msg += `*2* ➜ 3 mensagens\n`;
          msg += `*3* ➜ 5 mensagens\n`;
          msg += `*4* ➜ 10 mensagens\n`;
          msg += `*0* ➜ Voltar\n\n`;
          msg += `_Digite o número da opção_ ✍️`;
          return { newState: state, message: msg };
        }
        const newLength = map[input];
        await UserRepository.update(userId, { ai_context_length: newLength });
        const label = newLength === 0 ? 'sem histórico' : `${newLength} mensagens anteriores`;
        return { done: true, message: `✅ Histórico de contexto atualizado para *${label}*.` };
      }

      default:
        return { done: true, message: '❌ Fluxo inválido.' };
    }
  }
}

module.exports = new LLMMenu();
