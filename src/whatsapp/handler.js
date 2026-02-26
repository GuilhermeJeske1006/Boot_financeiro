const SessionManager = require('./session_manager');
const UserRepository = require('../repositories/user_respository');
const CompanyService = require('../services/company_service');
const MainMenu = require('./menus/main_menu');

var MY_ID = '215993922150427@lid';

const pendingRegistrations = {};

async function handleMessage(message) {
  if (message.to !== MY_ID) return;
  if (!message.fromMe) return;
  if (message.hasQuotedMsg) return;
  if (message.from.includes('@g.us')) return;
  if (message.type !== 'chat') return;

  const phone = message.from;
  const userInput = message.body.trim();

  let user = await UserRepository.findByPhone(phone);

  if (!user) {
    const registrationState = pendingRegistrations[phone];

    if (!registrationState) {
      pendingRegistrations[phone] = { step: 'name' };
      await message.reply(
        `👋 Olá! Bem-vindo ao *Bot Financeiro*!\n\n` +
        `📝 Para começar, qual é o seu *nome*?`
      );
      return;
    }

    if (registrationState.step === 'name') {
      if (!userInput || userInput.trim() === '') {
        await message.reply('⚠️ Nome não pode ser vazio. Por favor, digite seu nome:');
        return;
      }

      pendingRegistrations[phone] = {
        step: 'has_company',
        user_name: userInput.trim(),
      };

      await message.reply(
        `✅ Olá, *${userInput.trim()}*! 🎉\n\n` +
        `🏢 Você possui uma empresa?\n\n` +
        `*1* - Sim\n` +
        `*2* - Não\n\n` +
        `_Digite 1 ou 2_`
      );
      return;
    }

    if (registrationState.step === 'has_company') {
      if (userInput !== '1' && userInput !== '2') {
        await message.reply('⚠️ Por favor, digite *1* para Sim ou *2* para Não.');
        return;
      }

      if (userInput === '2') {
        user = await UserRepository.create({
          name: registrationState.user_name,
          phone: phone,
          user_type: 'PF',
        });

        delete pendingRegistrations[phone];
        SessionManager.initSession(phone, null);
        await message.reply(
          `✅ Cadastro realizado! Bem-vindo(a), *${user.name}*! 🎉\n\n` +
          await MainMenu.show(user.id)
        );
        return;
      }

      pendingRegistrations[phone] = { ...registrationState, step: 'company_name' };
      await message.reply(`🏢 Qual é o *nome da empresa* ou razão social?`);
      return;
    }

    if (registrationState.step === 'company_name') {
      if (!userInput || userInput.trim() === '') {
        await message.reply('⚠️ Nome da empresa não pode ser vazio. Por favor, digite o nome:');
        return;
      }

      pendingRegistrations[phone] = { ...registrationState, step: 'cnpj', company_name: userInput.trim() };
      await message.reply(`📄 Digite o *CNPJ* da empresa (ou *pular* para adicionar depois):`);
      return;
    }

    if (registrationState.step === 'cnpj') {
      const cnpj = userInput.toLowerCase() === 'pular' ? null : userInput.replace(/[^\d]/g, '');
      pendingRegistrations[phone] = { ...registrationState, step: 'email', cnpj };
      await message.reply(`📧 Digite o *e-mail* da empresa (ou *pular*):`);
      return;
    }

    if (registrationState.step === 'email') {
      const email = userInput.toLowerCase() === 'pular' ? null : userInput.trim();
      pendingRegistrations[phone] = { ...registrationState, step: 'phone_company', email };
      await message.reply(`📱 Digite o *telefone* da empresa (ou *pular*):`);
      return;
    }

    if (registrationState.step === 'phone_company') {
      const phoneCompany = userInput.toLowerCase() === 'pular' ? null : userInput.trim();
      pendingRegistrations[phone] = { ...registrationState, step: 'address', phone_company: phoneCompany };
      await message.reply(`📍 Digite o *endereço* da empresa (ou *pular*):`);
      return;
    }

    if (registrationState.step === 'address') {
      const address = userInput.toLowerCase() === 'pular' ? null : userInput.trim();

      user = await UserRepository.create({
        name: registrationState.user_name,
        phone: phone,
        user_type: 'PJ',
      });

      await CompanyService.create({
        user_id: user.id,
        name: registrationState.company_name,
        cnpj: registrationState.cnpj,
        email: registrationState.email,
        phone: registrationState.phone_company,
        address: address,
      });

      pendingRegistrations[phone] = {
        step: 'select_context',
        user_id: user.id,
        user_name: user.name,
        company_name: registrationState.company_name,
      };

      await message.reply(
        `✅ Cadastro realizado com sucesso!\n\n` +
        `🏢 Empresa *${registrationState.company_name}* cadastrada!\n\n` +
        `Bem-vindo(a) ao *Bot Financeiro*, *${user.name}*! 🎉\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🎯 Esta sessão é para:\n\n` +
        `👤 *1* ➜ Pessoa Física\n` +
        `🏢 *2* ➜ Empresa\n\n` +
        `_Digite 1 ou 2_ ✍️`
      );
      return;
    }

    if (registrationState.step === 'select_context') {
      if (userInput !== '1' && userInput !== '2') {
        await message.reply('⚠️ Por favor, digite *1* para Pessoa Física ou *2* para Empresa.');
        return;
      }

      const context = userInput === '1' ? 'PF' : 'PJ';
      delete pendingRegistrations[phone];
      SessionManager.initSession(phone, context);
      await message.reply(await MainMenu.show(registrationState.user_id));
      return;
    }
  }

  const response = await SessionManager.processInput(phone, user.id, userInput);


  if (response) {
    await message.reply(response);
  }
}

module.exports = { handleMessage };
