const express = require('express');
const ExportController = require('../controllers/export_controller');
const AuthMiddleware = require('../middlewares/auth_middleware');
const CheckPlan = require('../middlewares/check_plan');

const router = express.Router();

router.get('/pdf', AuthMiddleware.verifyToken, CheckPlan.requireFeature('pdf_export'), ExportController.pdf);
router.get('/excel', AuthMiddleware.verifyToken, CheckPlan.requireFeature('pdf_export'), ExportController.excel);

module.exports = router;
