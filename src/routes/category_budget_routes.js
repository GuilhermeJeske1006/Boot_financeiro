const express = require('express');
const CategoryBudgetController = require('../controllers/category_budget_controller');
const authMiddleware = require('../middlewares/auth_middleware');
const CheckPlan = require('../middlewares/check_plan');

const router = express.Router();

router.use(authMiddleware.verifyToken.bind(authMiddleware));

router.post('/', CheckPlan.requireFeature('category_budgets'), CategoryBudgetController.upsert.bind(CategoryBudgetController));
router.get('/', CategoryBudgetController.findByMonth.bind(CategoryBudgetController));
router.delete('/:id', CategoryBudgetController.delete.bind(CategoryBudgetController));

module.exports = router;
