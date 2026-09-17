const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');

router.post('/assign', roleController.assignRole);
router.get('/:did', roleController.getRole);
router.put('/:did', roleController.updateRole);

module.exports = router;
