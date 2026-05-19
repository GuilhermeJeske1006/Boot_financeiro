const express = require('express');
const AiController = require('../controllers/ai_controller');
const AuthMiddleware = require('../middlewares/auth_middleware');

const router = express.Router();

router.post('/chat', AuthMiddleware.verifyToken, AiController.chat);
router.delete('/chat', AuthMiddleware.verifyToken, AiController.clearHistory);

module.exports = router;
