const express = require('express');
const RecurringTransactionController = require('../controllers/recurring_transaction_controller');
const AuthMiddleware = require('../middlewares/auth_middleware');
const CheckPlan = require('../middlewares/check_plan');

const router = express.Router();

router.post('/', AuthMiddleware.verifyToken, CheckPlan.requireFeature('recurring_transactions'), RecurringTransactionController.create);
router.get('/', AuthMiddleware.verifyToken, CheckPlan.requireFeature('recurring_transactions'), RecurringTransactionController.list);
router.patch('/:id', AuthMiddleware.verifyToken, CheckPlan.requireFeature('recurring_transactions'), RecurringTransactionController.update);
router.delete('/:id', AuthMiddleware.verifyToken, CheckPlan.requireFeature('recurring_transactions'), RecurringTransactionController.deactivate);

module.exports = router;
