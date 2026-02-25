const express = require('express');
const AuthController = require('../controllers/auth_controller');
const AuthMiddleware = require('../middlewares/auth_middleware');

const router = express.Router();

router.post('/login', AuthController.login);
router.post('/logout', AuthMiddleware.verifyToken, AuthController.logout);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

module.exports = router;
