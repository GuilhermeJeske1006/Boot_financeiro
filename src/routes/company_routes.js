const express = require('express');
const CompanyController = require('../controllers/company_controller');
const AuthMiddleware = require('../middlewares/auth_middleware');

const router = express.Router();

router.post('/', AuthMiddleware.verifyToken, CompanyController.create);
router.get('/', AuthMiddleware.verifyToken, CompanyController.findAll);
router.get('/:id', AuthMiddleware.verifyToken, CompanyController.findById);
router.put('/:id', AuthMiddleware.verifyToken, CompanyController.update);
router.delete('/:id', AuthMiddleware.verifyToken, CompanyController.delete);
router.patch('/:id/user', AuthMiddleware.verifyToken, CompanyController.addUser);



module.exports = router;