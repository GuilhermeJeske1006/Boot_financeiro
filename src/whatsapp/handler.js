const SessionManager = require('./session_manager');
const UserRepository = require('../repositories/user_respository');
const RegistrationService = require('./services/registration_service');
const ShortcutHandler = require('./services/shortcut_handler');
const AiInterpreter = require('./services/ai_interpreter');
const AgentOrchestrator = require('./ai/agent_orchestrator');
const { twilioToPhone, sendMessage, sendMediaUrl, storeTempMedia } = require('./client');
const RateLimiter = require('./rate_limiter');

async function handleWebhook(req, res) {
  // Responde imediatamente com TwiML vazio (Twilio exige resposta em até 15s)
  res.type('text/xml').status(200).send('<Response></Response>');

  try {
    const { From, Body, NumMedia, MediaUrl0, MediaContentType0 } = req.body;
    if (!From) return;

    const phone = twilioToPhone(From);
    const numMedia = parseInt(NumMedia || '0', 10);
    const isAudio = numMedia > 0 && MediaContentType0?.startsWith('audio/');
    const isMedia = numMedia > 0 && !isAudio;

    if (isMedia) return;

    console.log(`[WHATSAPP] Received message from ${phone}: ${Body || '[media]'}`);

    const { blocked, shouldWarn } = RateLimiter.check(phone);
    if (blocked) {
      if (shouldWarn) {
        await sendMessage(phone, '⚠️ *Muitas mensagens em pouco tempo!*\n\nAguarde 30 segundos antes de enviar outra mensagem.');
      }
      return;
    }

    let user = await UserRepository.findByPhone(phone);
    console.log(`[WHATSAPP] user found: ${user ? user.id : 'null'}`);

    if (!user || RegistrationService.isRegistering(phone)) {
      if (isAudio) return;
      const userInput = (Body || '').trim();
      const result = await RegistrationService.handle(phone, userInput);
      console.log(`[WHATSAPP] registration reply: ${result.reply ? 'yes' : 'no'}`);
      if (result.reply) await sendMessage(phone, result.reply);
      if (result.done) SessionManager.initSession(phone);
      return;
    }

    if (isAudio) {
      if (!SessionManager.isInChatMode(phone)) return;
      const authHeader = 'Basic ' + Buffer.from(
        `${process.env.TWILIO_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64');
      const audioResponse = await fetch(MediaUrl0, { headers: { Authorization: authHeader } });
      const buffer = await audioResponse.arrayBuffer();
      const audioBase64 = Buffer.from(buffer).toString('base64');

      const transcription = await AiInterpreter.transcribeAudio(audioBase64, MediaContentType0);
      if (!transcription) {
        await sendMessage(phone, '⚠️ Não consegui transcrever o áudio. Tente enviar como texto.');
        return;
      }

      console.log(`[WHATSAPP] audio transcription userId=${user.id}: "${transcription}"`);
      const audioReply = await AgentOrchestrator.process(user.id, transcription);

      if (audioReply && typeof audioReply === 'object' && audioReply.__media) {
        const token = storeTempMedia(audioReply.__media.data, audioReply.__media.mimetype, audioReply.__media.filename);
        const mediaUrl = `${process.env.BASE_URL}/whatsapp/media/${token}`;
        await sendMediaUrl(phone, mediaUrl, audioReply.text || '');
      } else if (audioReply) {
        await sendMessage(phone, audioReply);
      }
      return;
    }

    const userInput = (Body || '').trim();
    if (!userInput) return;

    const shortcutResponse = await ShortcutHandler.handle(user.id, userInput);
    if (shortcutResponse) {
      await sendMessage(phone, shortcutResponse);
      return;
    }

    const sessionResponse = await SessionManager.processInput(phone, user.id, userInput);
    console.log(`[WHATSAPP] sessionResponse type: ${typeof sessionResponse}, value: ${JSON.stringify(sessionResponse)?.slice(0, 80)}`);
    if (!sessionResponse) return;

    if (typeof sessionResponse === 'object' && sessionResponse.media) {
      const token = storeTempMedia(
        sessionResponse.media.data,
        sessionResponse.media.mimetype,
        sessionResponse.media.filename,
      );
      const mediaUrl = `${process.env.BASE_URL}/whatsapp/media/${token}`;
      await sendMediaUrl(phone, mediaUrl, sessionResponse.text || '');
    } else {
      await sendMessage(phone, sessionResponse);
    }
  } catch (err) {
    console.error('[WhatsApp Webhook] Erro:', err.message);
  }
}

module.exports = { handleWebhook };
