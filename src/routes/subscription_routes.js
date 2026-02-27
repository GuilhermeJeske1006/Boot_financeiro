const express = require('express');
const SubscriptionController = require('../controllers/subscription_controller');
const AuthMiddleware = require('../middlewares/auth_middleware');

const router = express.Router();

router.get('/plans', SubscriptionController.getPlans);
router.get('/my', AuthMiddleware.verifyToken, SubscriptionController.getMySubscription);
router.patch('/upgrade', AuthMiddleware.verifyToken, SubscriptionController.upgradePlan);

module.exports = router;
