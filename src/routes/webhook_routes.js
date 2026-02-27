const express = require('express');
const WebhookController = require('../controllers/webhook_controller');

const router = express.Router();

// POST /api/webhooks/abacatepay?webhookSecret=<secret>
// Rota sem JWT — autenticação feita via webhookSecret na query string
router.post('/abacatepay', WebhookController.abacatePay);

module.exports = router;
