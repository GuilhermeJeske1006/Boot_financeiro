const SessionManager = require('./session_manager');
const UserRepository = require('../repositories/user_respository');
const MainMenu = require('./menus/main_menu');

var MY_ID = process.env.MY_ID || '215993922150427@lid';

// controle de cadastro pendente por telefone
const pendingRegistrations = new Set();

async function handleMessage(message) {
  // valida se a mensagem foi endereçada a este cliente (bot)
  if (message.to !== MY_ID) return;
  // algumas libs definem `fromMe` quando a mensagem foi enviada por este cliente
  if (!message.fromMe) return;
  // ignora respostas do bot (reply cria mensagem com citação)
  if (message.hasQuotedMsg) return;
  // ignora mensagens de grupos
  if (message.from.includes('@g.us')) return;
  // ignora mensagens que não são texto
  if (message.type !== 'chat') return;

  // identifica o número do remetente
  const phone = message.from;
  const userInput = message.body.trim();

  // busca o usuário pelo telefone
  let user = await UserRepository.findByPhone(phone);

  // se o usuário não existe, fluxo de cadastro
  if (!user) {
    if (!pendingRegistrations.has(phone)) {
      // primeira mensagem - pede o nome
      pendingRegistrations.add(phone);
      await message.reply(
        `👋 Olá! Bem-vindo ao *Bot Financeiro*!\n\n` +
        `Para começar, me diga: qual é o seu *nome*?`
      );
      return;
    }

    // segunda mensagem - salva o nome e cadastra
    pendingRegistrations.delete(phone);
    user = await UserRepository.createByPhone(phone, userInput);
    await message.reply(
      `✅ Cadastro realizado! Bem-vindo(a), *${user.name}*! 🎉\n\n` +
      MainMenu.show()
    );
    return;
  }

  // usuário já cadastrado - fluxo normal
  const response = await SessionManager.processInput(phone, user.id, userInput);

  if (response) {
    await message.reply(response);
  }
}

module.exports = { handleMessage };
