const express = require('express');
const WebhookController = require('../controllers/webhook_controller');

const router = express.Router();

// POST /api/webhooks/stripe
// Raw body required for Stripe signature verification (set in app.js before express.json)
router.post('/stripe', WebhookController.stripe.bind(WebhookController));

module.exports = router;
