const express = require('express');
const AuthController = require('../controllers/auth_controller');
const AuthMiddleware = require('../middlewares/auth_middleware');
const { authLimiter } = require('../middlewares/rate_limit');

const router = express.Router();

router.post('/login', authLimiter, AuthController.login);
router.post('/logout', AuthMiddleware.verifyToken, AuthController.logout);
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/reset-password', authLimiter, AuthController.resetPassword);

module.exports = router;
