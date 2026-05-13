const twilio = require('twilio');
const { randomUUID } = require('crypto');

const FROM = process.env.TWILIO_WHATSAPP_NUMBER;

let client = null;
const mediaStore = new Map();

function initializeWhatsApp() {
  client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log('Twilio WhatsApp client initialized');
  return client;
}

function getClient() {
  return client;
}

// '554791907479@c.us' → 'whatsapp:+554791907479'
function phoneToTwilio(phone) {
  return 'whatsapp:+' + phone.replace('@c.us', '');
}

// 'whatsapp:+554791907479' → '554791907479@c.us'
function twilioToPhone(from) {
  return from.replace('whatsapp:+', '') + '@c.us';
}

async function sendMessage(phone, text) {
  if (!client || !phone) return;
  const to = phoneToTwilio(phone);
  console.log(`[Twilio] sendMessage from=${FROM} to=${to}`);
  try {
    const msg = await client.messages.create({ from: FROM, to, body: text });
    console.log(`[Twilio] sent sid=${msg.sid} status=${msg.status}`);
  } catch (err) {
    console.error(`[Twilio] Falha ao enviar mensagem para ${phone}:`, err.message);
  }
}

async function sendMediaUrl(phone, mediaUrl, caption) {
  if (!client || !phone) return;
  try {
    await client.messages.create({ from: FROM, to: phoneToTwilio(phone), mediaUrl: [mediaUrl], body: caption || '' });
  } catch (err) {
    console.error(`[Twilio] Falha ao enviar mídia para ${phone}:`, err.message);
  }
}

// Armazena arquivo em memória para servir via URL pública (uso único, TTL 10min)
function storeTempMedia(data, mimetype, filename) {
  const token = randomUUID();
  mediaStore.set(token, { data, mimetype, filename });
  setTimeout(() => mediaStore.delete(token), 10 * 60 * 1000);
  return token;
}

function getTempMedia(token) {
  const media = mediaStore.get(token);
  if (media) mediaStore.delete(token);
  return media;
}

module.exports = {
  initializeWhatsApp,
  getClient,
  phoneToTwilio,
  twilioToPhone,
  sendMessage,
  sendMediaUrl,
  storeTempMedia,
  getTempMedia,
};
