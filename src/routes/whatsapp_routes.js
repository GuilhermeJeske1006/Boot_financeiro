const express = require('express');
const { handleWebhook } = require('../whatsapp/handler');
const { getTempMedia } = require('../whatsapp/client');

const router = express.Router();

// Twilio envia form-urlencoded, não JSON
router.post('/webhook', express.urlencoded({ extended: false }), handleWebhook);

// Servir arquivos temporários (PDF, Excel) para Twilio buscar e entregar ao usuário
router.get('/media/:token', (req, res) => {
  const media = getTempMedia(req.params.token);
  if (!media) return res.status(404).end();
  const buf = Buffer.from(media.data, 'base64');
  res.setHeader('Content-Type', media.mimetype);
  res.setHeader('Content-Disposition', `attachment; filename="${media.filename}"`);
  res.end(buf);
});

module.exports = router;
