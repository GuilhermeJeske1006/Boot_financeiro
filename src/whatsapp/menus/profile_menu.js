const UserRepository = require('../../repositories/user_respository');

class ProfileMenu {
  async showProfile(userId) {
    const user = await UserRepository.findById(userId);
    let msg = `👤 *Meu Perfil*\n\n`;
    msg += `📝 Nome: *${user.name}*\n`;
    msg += `📱 Telefone: ${user.phone}\n\n`;
    msg += `✏️ *1* ➜ Editar nome\n`;
    msg += `🔙 *0* ➜ Voltar ao menu\n\n`;
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
        if (input !== '1') {
          const { message } = await this.showProfile(userId);
          return { newState: state, message };
        }
        const user = await UserRepository.findById(userId);
        return {
          newState: { ...state, step: 2 },
          message: `✏️ Nome atual: *${user.name}*\n\nDigite o *novo nome*:`,
        };
      }

      case 2: {
        if (!input || input.trim() === '') {
          return { newState: state, message: '⚠️ Nome não pode ser vazio. Digite o novo nome:' };
        }
        const newName = input.trim();
        const summary = `✅ Novo nome: *${newName}*\n\n✅ *S* para confirmar\n❌ *N* para cancelar`;
        return {
          newState: { ...state, step: 3, data: { ...state.data, newName } },
          message: summary,
        };
      }

      case 3: {
        if (input.toUpperCase() === 'S') {
          try {
            await UserRepository.update(userId, { name: state.data.newName });
            return { done: true, message: `🎉✅ Nome atualizado para *${state.data.newName}* com sucesso!` };
          } catch (error) {
            return { done: true, message: `❌ Erro ao atualizar nome: ${error.message}` };
          }
        }
        return { done: true, message: '❌ Edição cancelada.' };
      }

      default:
        return { done: true, message: '❌ Fluxo inválido.' };
    }
  }
}

module.exports = new ProfileMenu();
