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

  console.log('Message received:', message);
  const phone = message.from;
  const userInput = message.body.trim();

  let user = await UserRepository.findByPhone(phone);

  if (!user) {
    const registrationState = pendingRegistrations[phone];

    if (!registrationState) {
      pendingRegistrations[phone] = { step: 'user_type' };
      await message.reply(
        `👋 Olá! Bem-vindo ao *Bot Financeiro*!\n\n` +
        `Antes de começar, me diga:\n\n` +
        `Você é:\n` +
        `*1* - Pessoa Física (PF) 👤\n` +
        `*2* - Pessoa Jurídica/Empresa (PJ) 🏢\n\n` +
        `_Digite 1 ou 2_`
      );
      return;
    }

    if (registrationState.step === 'user_type') {
      if (userInput !== '1' && userInput !== '2') {
        await message.reply('⚠️ Por favor, digite *1* para Pessoa Física ou *2* para Pessoa Jurídica.');
        return;
      }

      const userType = userInput === '1' ? 'PF' : 'PJ';
      pendingRegistrations[phone] = { step: 'name', user_type: userType };

      const typeLabel = userType === 'PF' ? 'Pessoa Física' : 'Empresa';
      await message.reply(
        `✅ Tipo selecionado: *${typeLabel}*\n\n` +
        `📝 Agora, qual é o seu *nome${userType === 'PJ' ? ' ou razão social' : ''}*?`
      );
      return;
    }

    if (registrationState.step === 'name') {
      if (!userInput || userInput.trim() === '') {
        await message.reply('⚠️ Nome não pode ser vazio. Por favor, digite seu nome:');
        return;
      }

      const userData = {
        name: userInput.trim(),
        phone: phone,
        user_type: registrationState.user_type
      };

      user = await UserRepository.create(userData);

      if (registrationState.user_type === 'PJ') {
        pendingRegistrations[phone] = { step: 'cnpj', user_id: user.id, company_name: userInput.trim() };
        await message.reply(
          `✅ Nome: *${userInput.trim()}*\n\n` +
          `📄 Digite o *CNPJ* da empresa (ou digite *pular* para adicionar depois):`
        );
        return;
      } else {
        delete pendingRegistrations[phone];
        await message.reply(
          `✅ Cadastro realizado! Bem-vindo(a), *${user.name}*! 🎉\n\n` +
          await MainMenu.show(user.id)
        );
        return;
      }
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

      await CompanyService.create({
        user_id: registrationState.user_id,
        name: registrationState.company_name,
        cnpj: registrationState.cnpj,
        email: registrationState.email,
        phone: registrationState.phone_company,
        address: address
      });

      delete pendingRegistrations[phone];

      const userComplete = await UserRepository.findById(registrationState.user_id);
      await message.reply(
        `✅ Cadastro realizado com sucesso!\n\n` +
        `🏢 Empresa *${registrationState.company_name}* cadastrada!\n\n` +
        `Bem-vindo(a) ao *Bot Financeiro*, *${userComplete.name}*! 🎉\n\n` +
        await MainMenu.show(registrationState.user_id)
      );
      return;
    }
  }

  const response = await SessionManager.processInput(phone, user.id, userInput);

  if (response) {
    await message.reply(response);
  }
}

module.exports = { handleMessage };
