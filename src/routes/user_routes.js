const express = require('express');
const UserController = require('../controllers/user_controller');
const AuthMiddleware = require('../middlewares/auth_middleware');
const { registerLimiter } = require('../middlewares/rate_limit');

const router = express.Router();

router.post('/', registerLimiter, UserController.create);
router.get('/', AuthMiddleware.verifyToken, UserController.findAll);
router.get('/:id', AuthMiddleware.verifyToken, UserController.findById);
router.put('/:id', AuthMiddleware.verifyToken, UserController.update);

module.exports = router;
