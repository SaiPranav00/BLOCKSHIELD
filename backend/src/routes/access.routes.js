const express = require('express');
const router = express.Router();
const accessController = require('../controllers/access.controller');

router.post('/verify', accessController.verifyAuth);
router.post('/verify-auth', accessController.verifyAuth);

router.post('/check', accessController.checkAccess);
router.post('/check-access', accessController.checkAccess);

router.post('/login', accessController.login);
router.post('/register', accessController.registerUser);

module.exports = router;
