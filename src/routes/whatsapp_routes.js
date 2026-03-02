const express = require('express');
const path = require('path');
const QRCode = require('qrcode');
const { getWhatsAppStatus } = require('../whatsapp/client');

const router = express.Router();

router.get('/qr', (req, res) => {
  // Permite inline scripts apenas nesta rota de administração
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:");
  res.sendFile(path.join(__dirname, '../views/whatsapp_qr.html'));
});

router.get('/status', async (req, res) => {
  const { connected, qr } = getWhatsAppStatus();

  if (connected) return res.json({ connected: true, qr: null });
  if (!qr) return res.json({ connected: false, qr: null });

  const qrImage = await QRCode.toDataURL(qr);
  res.json({ connected: false, qr: qrImage });
});

module.exports = router;
