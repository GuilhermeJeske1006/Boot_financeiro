const express = require('express');
const UserController = require('../controllers/user_controller');

const router = express.Router();

router.post('/', UserController.create);
router.get('/', UserController.findAll);

module.exports = router;
