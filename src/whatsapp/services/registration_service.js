const UserRepository = require('../../repositories/user_respository');
const CompanyService = require('../../services/company_service');
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

      pendingRegistrations[phone] = { step: 'has_company', user_name: userInput };
      return {
        reply:
          `✅ Olá, *${userInput}*! 🎉\n\n` +
          `🏢 Você possui uma empresa?\n\n` +
          `*1* - Sim\n` +
          `*2* - Não\n\n` +
          `_Digite 1 ou 2_`,
      };
    }

    if (state.step === 'has_company') {
      if (userInput !== '1' && userInput !== '2') {
        return { reply: '⚠️ Por favor, digite *1* para Sim ou *2* para Não.' };
      }

      if (userInput === '2') {
        const user = await UserRepository.create({
          name: state.user_name,
          phone,
          user_type: 'PF',
        });

        
        SlackService.notifyNewUser({ userId: user.id, userName: user.name, userEmail: user.email });

        delete pendingRegistrations[phone];
        return {
          done: true,
          user,
          context: null, 
          reply:
            `✅ Cadastro realizado! Bem-vindo(a), *${user.name}*! 🎉\n\n` +
            (await MainMenu.show(user.id)),
        };
      }

      pendingRegistrations[phone] = { ...state, step: 'company_name' };
      return { reply: `🏢 Qual é o *nome da empresa* ou razão social?` };
    }

    if (state.step === 'company_name') {
      if (!userInput) {
        return { reply: '⚠️ Nome da empresa não pode ser vazio. Por favor, digite o nome:' };
      }

      pendingRegistrations[phone] = { ...state, step: 'cnpj', company_name: userInput };
      return { reply: `📄 Digite o *CNPJ* da empresa (ou *pular* para adicionar depois):` };
    }

    if (state.step === 'cnpj') {
      const cnpj = userInput.toLowerCase() === 'pular' ? null : userInput.replace(/[^\d]/g, '');
      pendingRegistrations[phone] = { ...state, step: 'email', cnpj };
      return { reply: `📧 Digite o *e-mail* da empresa (ou *pular*):` };
    }

    if (state.step === 'email') {
      const email = userInput.toLowerCase() === 'pular' ? null : userInput;
      pendingRegistrations[phone] = { ...state, step: 'phone_company', email };
      return { reply: `📱 Digite o *telefone* da empresa (ou *pular*):` };
    }

    if (state.step === 'phone_company') {
      const phoneCompany = userInput.toLowerCase() === 'pular' ? null : userInput;
      pendingRegistrations[phone] = { ...state, step: 'address', phone_company: phoneCompany };
      return { reply: `📍 Digite o *endereço* da empresa (ou *pular*):` };
    }

    if (state.step === 'address') {
      const address = userInput.toLowerCase() === 'pular' ? null : userInput;

      const user = await UserRepository.create({
        name: state.user_name,
        phone,
        user_type: 'PJ',
      });

      SlackService.notifyNewUser({ userId: user.id, userName: user.name, userEmail: user.email });


      await CompanyService.create({
        user_id: user.id,
        name: state.company_name,
        cnpj: state.cnpj,
        email: state.email,
        phone: state.phone_company,
        address,
      });

      pendingRegistrations[phone] = {
        step: 'select_context',
        user_id: user.id,
        user_name: user.name,
        company_name: state.company_name,
      };

      return {
        reply:
          `✅ Cadastro realizado com sucesso!\n\n` +
          `🏢 Empresa *${state.company_name}* cadastrada!\n\n` +
          `Bem-vindo(a) ao *Bot Financeiro*, *${user.name}*! 🎉\n\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `🎯 Esta sessão é para:\n\n` +
          `👤 *1* ➜ Pessoa Física\n` +
          `🏢 *2* ➜ Empresa\n\n` +
          `_Digite 1 ou 2_ ✍️`,
      };
    }

    if (state.step === 'select_context') {
      if (userInput !== '1' && userInput !== '2') {
        return { reply: '⚠️ Por favor, digite *1* para Pessoa Física ou *2* para Empresa.' };
      }

      const context = userInput === '1' ? 'PF' : 'PJ';
      const { user_id, user_name } = state;
      delete pendingRegistrations[phone];

      return {
        done: true,
        user: { id: user_id, name: user_name },
        context,
        reply: await MainMenu.show(user_id),
      };
    }
  }
}

module.exports = new RegistrationService();
