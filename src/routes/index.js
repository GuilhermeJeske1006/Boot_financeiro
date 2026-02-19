const express = require('express');
const userRoutes = require('./user_routes.js');
const authRoutes = require('./auth_routes.js');
// const AuthMiddleware = require('../middlewares/auth_middleware.js');

const router = express.Router();


router.use('/users', userRoutes);
router.use('/auth', authRoutes);

module.exports = router;
