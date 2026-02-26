const SessionManager = require('./session_manager');
const UserRepository = require('../repositories/user_respository');
const RegistrationService = require('./registration_service');

var MY_ID = '215993922150427@lid';

async function handleMessage(message) {
  if (message.to !== MY_ID) return;
  if (!message.fromMe) return;
  if (message.hasQuotedMsg) return;
  if (message.from.includes('@g.us')) return;
  if (message.type !== 'chat') return;

  const phone = message.from;
  const userInput = message.body.trim();

  let user = await UserRepository.findByPhone(phone);

  if (!user || RegistrationService.isRegistering(phone)) {
    const result = await RegistrationService.handle(phone, userInput);

    if (result.reply) {
      await message.reply(result.reply);
    }

    if (result.done) {
      SessionManager.initSession(phone, result.context);
    }

    return;
  }

  const response = await SessionManager.processInput(phone, user.id, userInput);

  if (response) {
    await message.reply(response);
  }
}

module.exports = { handleMessage };
