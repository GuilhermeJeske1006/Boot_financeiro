const UserRepository = require('../../repositories/user_respository');
const SlackService = require('../../services/slack_service');
const MainMenu = require('../menus/main_menu');

const pendingRegistrations = {};

class RegistrationService {
  isRegistering(phone) {
    return !!pendingRegistrations[phone];
  }

  async handle(phone, userInput) {
    const state = pendingRegistrations[phone];

    if (!state) {
      pendingRegistrations[phone] = { step: 'name' };
      return {
        reply:
          `👋 Olá! Bem-vindo ao *Bot Financeiro*!\n\n` +
          `📝 Para começar, qual é o seu *nome*?`,
      };
    }

    if (state.step === 'name') {
      if (!userInput) {
        return { reply: '⚠️ Nome não pode ser vazio. Por favor, digite seu nome:' };
      }

      const user = await UserRepository.create({
        name: userInput,
        phone,
        user_type: 'PF',
      });

      SlackService.notifyNewUser({ userId: user.id, userName: user.name, userEmail: user.email });

      delete pendingRegistrations[phone];
      return {
        done: true,
        user,
        reply:
          `✅ Cadastro realizado! Bem-vindo(a), *${user.name}*! 🎉\n\n` +
          (await MainMenu.show(user.id)),
      };
    }
  }
}

module.exports = new RegistrationService();
