const express = require('express');
const InvitationController = require('../controllers/invitation_controller');
const AuthMiddleware = require('../middlewares/auth_middleware');

const router = express.Router();

// Aceitar convite (usuário autenticado)
router.get('/accept', AuthMiddleware.verifyToken, InvitationController.accept);

module.exports = router;
