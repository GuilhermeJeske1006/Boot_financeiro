const express = require('express');
const CategoryController = require('../controllers/category_controller');
const AuthMiddleware = require('../middlewares/auth_middleware');

const router = express.Router();

router.get('/', AuthMiddleware.verifyToken, CategoryController.findAll);

module.exports = router;
