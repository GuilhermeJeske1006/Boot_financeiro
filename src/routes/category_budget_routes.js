const express = require('express');
const CategoryBudgetController = require('../controllers/category_budget_controller');
const authMiddleware = require('../middlewares/auth_middleware');

const router = express.Router();

router.use(authMiddleware.verifyToken.bind(authMiddleware));

router.post('/', CategoryBudgetController.upsert.bind(CategoryBudgetController));
router.get('/', CategoryBudgetController.findByMonth.bind(CategoryBudgetController));
router.delete('/:id', CategoryBudgetController.delete.bind(CategoryBudgetController));

module.exports = router;
