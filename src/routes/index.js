const express = require('express');
const userRoutes = require('./user_routes.js');
const authRoutes = require('./auth_routes.js');
const companyRoutes = require('./company_routes.js');
const transactionRoutes = require('./transaction_routes.js');
const categoryRoutes = require('./category_routes.js');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/transactions', transactionRoutes);
router.use('/categories', categoryRoutes);

module.exports = router;
