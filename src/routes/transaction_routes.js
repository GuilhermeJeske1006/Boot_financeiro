const express = require('express');
const TransactionController = require('../controllers/transation_controller');
const AuthMiddleware = require('../middlewares/auth_middleware');

const router = express.Router();

router.post('/', AuthMiddleware.verifyToken, TransactionController.create);
router.get('/', AuthMiddleware.verifyToken, TransactionController.findByMonth);
router.get('/summary', AuthMiddleware.verifyToken, TransactionController.getMonthlySummary);
router.get('/company/:companyId', AuthMiddleware.verifyToken, TransactionController.findByCompany);
router.delete('/:id', AuthMiddleware.verifyToken, TransactionController.delete);


module.exports = router;
