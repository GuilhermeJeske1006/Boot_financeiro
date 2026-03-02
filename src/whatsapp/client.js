const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

function resolveChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const cacheDir =
    process.env.PUPPETEER_CACHE_DIR ||
    path.join(process.cwd(), '.puppeteer_cache');
  const chromeCacheDir = path.join(cacheDir, 'chrome');
  if (!fs.existsSync(chromeCacheDir)) return undefined;
  const versions = fs
    .readdirSync(chromeCacheDir)
    .filter((v) => fs.statSync(path.join(chromeCacheDir, v)).isDirectory())
    .sort();
  if (!versions.length) return undefined;
  const binary = path.join(chromeCacheDir, versions[versions.length - 1], 'chrome-linux64', 'chrome');
  return fs.existsSync(binary) ? binary : undefined;
}

let client = null;
let currentQr = null;
let connected = false;

// Rastreia mensagens enviadas programaticamente (webhook) para o handler ignorar
const pendingWebhookMessages = new Map();

function getWhatsAppStatus() {
  return { connected, qr: currentQr };
}

function markWebhookMessage(phone) {
  pendingWebhookMessages.set(phone, (pendingWebhookMessages.get(phone) || 0) + 1);
}

function consumeWebhookMessage(phone) {
  const count = pendingWebhookMessages.get(phone) || 0;
  if (count <= 0) return false;
  if (count === 1) pendingWebhookMessages.delete(phone);
  else pendingWebhookMessages.set(phone, count - 1);
  return true;
}

function initializeWhatsApp() {
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth',
    }),
    puppeteer: {
      headless: true,
      executablePath: resolveChromePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    },
  });

  client.on('qr', (qr) => {
    currentQr = qr;
    connected = false;
    console.log('Escaneie o QR code abaixo para conectar o WhatsApp:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    connected = true;
    currentQr = null;
    console.log('Bot do WhatsApp conectado e pronto!');
  });

  client.on('authenticated', () => {
    console.log('WhatsApp autenticado com sucesso');
  });

  client.on('auth_failure', (msg) => {
    console.error('Falha na autenticação do WhatsApp:', msg);
  });

  client.on('disconnected', (reason) => {
    connected = false;
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

module.exports = { initializeWhatsApp, getClient, markWebhookMessage, consumeWebhookMessage, getWhatsAppStatus };
