const express = require('express');
const UserController = require('../controllers/user_controller');

const router = express.Router();

router.post('/',  UserController.create);
router.get('/', UserController.findAll);
router.get('/:id', UserController.findById);
router.put('/:id', UserController.update);

module.exports = router;
