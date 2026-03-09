const { MessageMedia } = require('whatsapp-web.js');
const SessionManager = require('./session_manager');
const UserRepository = require('../repositories/user_respository');
const RegistrationService = require('./services/registration_service');
const ShortcutHandler = require('./services/shortcut_handler');
const AiInterpreter = require('./services/ai_interpreter');
const { getClient, consumeWebhookMessage } = require('./client');
const RateLimiter = require('./rate_limiter');

var MY_ID = process.env.WHATSAPP_ID;

async function handleMessage(message) {
  if (message.to !== MY_ID) return;
  if (!message.fromMe) return;
  if (message.hasQuotedMsg) return;
  if (message.from.includes('@g.us')) return;
  const isAudio = message.type === 'ptt' || message.type === 'audio';
  if (message.type !== 'chat' && !isAudio) return;
  if (consumeWebhookMessage(message.to)) return;

  // if (message.from !== '554791907479@c.us' && message.from !== '554792801006@c.us' && message.from !== '554499891487@c.us') return;

  const phone = message.from;

  const { blocked, shouldWarn } = RateLimiter.check(phone);
  if (blocked) {
    if (shouldWarn) {
      await message.reply(
        '⚠️ *Muitas mensagens em pouco tempo!*\n\nAguarde 30 segundos antes de enviar outra mensagem.'
      );
    }
    return;
  }

  let user = await UserRepository.findByPhone(phone);

  if (!user || RegistrationService.isRegistering(phone)) {
    if (isAudio) return; // ignora áudio durante o cadastro
    const userInput = message.body.trim();
    const result = await RegistrationService.handle(phone, userInput);
    if (result.reply) await message.reply(result.reply);
    if (result.done) SessionManager.initSession(phone, result.context);
    return;
  }

  // Áudio: só processa no modo chat
  if (isAudio) {
    if (!SessionManager.isInChatMode(phone)) return;
    const media = await message.downloadMedia();
    if (!media) return;
    const response = await AiInterpreter.interpretAudio(user.id, media.data, media.mimetype);
    if (response) await message.reply(response);
    return;
  }

  const userInput = message.body.trim();

  const shortcutResponse = await ShortcutHandler.handle(user.id, userInput);
  if (shortcutResponse) {
    await message.reply(shortcutResponse);
    return;
  }

  const response = await SessionManager.processInput(phone, user.id, userInput);

  if (!response) return;

  if (typeof response === 'object' && response.media) {
    const media = new MessageMedia(response.media.mimetype, response.media.data, response.media.filename);
    const client = getClient();
    await client.sendMessage(phone, media, { caption: response.text || '' });
  } else {
    await message.reply(response);
  }
}

module.exports = { handleMessage };
