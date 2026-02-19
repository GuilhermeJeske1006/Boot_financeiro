const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client = null;

function initializeWhatsApp() {
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth',
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    console.log('Escaneie o QR code abaixo para conectar o WhatsApp:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('Bot do WhatsApp conectado e pronto!');
  });

  client.on('authenticated', () => {
    console.log('WhatsApp autenticado com sucesso');
  });

  client.on('auth_failure', (msg) => {
    console.error('Falha na autenticação do WhatsApp:', msg);
  });

  client.on('disconnected', (reason) => {
    console.log('WhatsApp desconectado:', reason);
  });

  const { handleMessage } = require('./handler');
  client.on('message_create', handleMessage);

  client.initialize();

  return client;
}

function getClient() {
  return client;
}

module.exports = { initializeWhatsApp, getClient };
